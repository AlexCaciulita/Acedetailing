import fs from 'node:fs';
import { getStore } from '@netlify/blobs';

const DATA_DIR = '/tmp/nova-detailing-admin';
const BLOB_STORE = 'nova-admin';
const BLOB_KEY = 'state-v1';

// The existing API deliberately uses a synchronous store. On Netlify, each
// request hydrates that store from a site-level Blob, then writes the complete
// snapshot back with an optimistic concurrency check.
process.env.NOVA_DATA_DIR = DATA_DIR;

const PUBLIC_STATE_ROUTES = new Set([
  'create-booking',
  'create-contact',
  'create-enrollment',
  'create-b2b-lead'
]);

let modulesPromise;

function loadModules() {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      import('../../api/admin/index.js'),
      import('../../api/admin/_store.js'),
      import('../../api/create-booking.js'),
      import('../../api/create-contact.js'),
      import('../../api/create-enrollment.js'),
      import('../../api/create-b2b-lead.js'),
      import('../../api/chat-proxy.js'),
      import('../../api/payu-create-order.js'),
      import('../../api/payu-notify.js'),
      import('../../api/get-record.js')
    ]).then(([
      admin,
      store,
      booking,
      contact,
      enrollment,
      b2bLead,
      chat,
      payuCreate,
      payuNotify,
      record
    ]) => ({
      admin: admin.default,
      store,
      booking: booking.default,
      contact: contact.default,
      enrollment: enrollment.default,
      b2bLead: b2bLead.default,
      chat: chat.default,
      payuCreate: payuCreate.default,
      payuNotify: payuNotify.default,
      record: record.default
    }));
  }
  return modulesPromise;
}

function routeFromEvent(event) {
  let pathname = event.path || '/';
  try {
    pathname = new URL(event.rawUrl || event.raw_url || pathname, 'https://novadetailing.ro').pathname;
  } catch {
    // Fall back to event.path.
  }

  return pathname
    .replace(/^\/\.netlify\/functions\/api\/?/, '')
    .replace(/^\/api\/?/, '')
    .replace(/^\/+|\/+$/g, '');
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  return JSON.parse(raw);
}

function createResponse() {
  let statusCode = 200;
  let body;
  const headers = { 'Cache-Control': 'no-store' };

  const findHeader = (name) => Object.keys(headers)
    .find((key) => key.toLowerCase() === String(name).toLowerCase());

  const response = {
    get headersSent() {
      return body !== undefined;
    },
    setHeader(name, value) {
      const existing = findHeader(name);
      if (existing && existing !== name) delete headers[existing];
      headers[name] = value;
      return response;
    },
    getHeader(name) {
      const key = findHeader(name);
      return key ? headers[key] : undefined;
    },
    removeHeader(name) {
      const key = findHeader(name);
      if (key) delete headers[key];
      return response;
    },
    status(code) {
      statusCode = code;
      return response;
    },
    json(value) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      body = JSON.stringify(value);
      return response;
    },
    send(value) {
      if (typeof value === 'object' && value !== null) return response.json(value);
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      body = String(value ?? '');
      return response;
    },
    end(value = '') {
      body = String(value ?? '');
      return response;
    },
    result() {
      return { statusCode, headers, body: body ?? '' };
    }
  };

  return response;
}

function requestFromEvent(event, route) {
  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    method: event.httpMethod || 'GET',
    headers,
    body: parseBody(event),
    query: event.queryStringParameters || {},
    url: event.rawUrl || event.raw_url || event.path,
    socket: {
      remoteAddress: headers['x-nf-client-connection-ip'] || headers['x-forwarded-for'] || 'netlify'
    },
    adminPath: route.startsWith('admin/') ? route.slice('admin/'.length) : '',
    params: {}
  };
}

function needsState(route) {
  if (PUBLIC_STATE_ROUTES.has(route)) return true;
  if (!route.startsWith('admin/')) return false;
  return !['admin/session', 'admin/login', 'admin/logout'].includes(route);
}

function mutatesState(route, method) {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  return PUBLIC_STATE_ROUTES.has(route) || route.startsWith('admin/');
}

async function hydrateState(storeModule) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const blobStore = getStore({ name: BLOB_STORE, consistency: 'strong' });
  const snapshot = await blobStore.getWithMetadata(BLOB_KEY, {
    consistency: 'strong',
    type: 'json'
  });
  const collections = snapshot?.data?.collections || {};

  for (const name of Object.keys(storeModule.COLLECTIONS)) {
    storeModule.write(name, collections[name] || {});
  }

  return { blobStore, etag: snapshot?.etag || null };
}

async function persistState(persistence, storeModule) {
  const collections = {};
  for (const name of Object.keys(storeModule.COLLECTIONS)) {
    collections[name] = storeModule.read(name);
  }

  const options = persistence.etag
    ? { onlyIfMatch: persistence.etag }
    : { onlyIfNew: true };
  const result = await persistence.blobStore.setJSON(BLOB_KEY, {
    version: 1,
    updatedAt: new Date().toISOString(),
    collections
  }, options);

  return result.modified;
}

function resolveHandler(route, modules, req) {
  if (route === 'admin' || route.startsWith('admin/')) return modules.admin;

  const exact = {
    'create-booking': modules.booking,
    'create-contact': modules.contact,
    'create-enrollment': modules.enrollment,
    'create-b2b-lead': modules.b2bLead,
    'chat-proxy': modules.chat,
    'payu-create-order': modules.payuCreate,
    'payu-notify': modules.payuNotify
  };
  if (exact[route]) return exact[route];

  const recordMatch = route.match(/^record\/([^/]+)$/);
  if (recordMatch) {
    req.params = { code: decodeURIComponent(recordMatch[1]) };
    return modules.record;
  }

  return null;
}

async function handleEvent(event) {
  const route = routeFromEvent(event);
  let req;

  try {
    req = requestFromEvent(event, route);
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ success: false, message: 'Corpul cererii nu este JSON valid.' })
    };
  }

  const response = createResponse();

  try {
    const modules = await loadModules();
    const routeHandler = resolveHandler(route, modules, req);
    if (!routeHandler) {
      return response.status(404).json({ success: false, message: 'Rută API necunoscută.' }).result();
    }

    const persistence = needsState(route)
      ? await hydrateState(modules.store)
      : null;

    await routeHandler(req, response);

    if (persistence && mutatesState(route, req.method) && response.result().statusCode < 500) {
      const saved = await persistState(persistence, modules.store);
      if (!saved) {
        return response.status(409).json({
          success: false,
          message: 'Datele au fost actualizate în altă sesiune. Reîncarcă pagina și încearcă din nou.'
        }).result();
      }
    }

    return response.result();
  } catch (error) {
    console.error('Netlify API error:', error);
    return response.status(500).json({
      success: false,
      message: 'Serviciul nu este disponibil momentan.'
    }).result();
  }
}

// Netlify's modern Request/Response function runtime provides the complete
// Blobs context, including the uncached endpoint required for strong reads.
export default async function netlifyHandler(request) {
  const url = new URL(request.url);
  const method = request.method || 'GET';
  const hasBody = !['GET', 'HEAD'].includes(method);
  const body = hasBody ? await request.text() : '';
  const event = {
    path: url.pathname,
    rawUrl: request.url,
    httpMethod: method,
    headers: Object.fromEntries(request.headers.entries()),
    body,
    isBase64Encoded: false,
    queryStringParameters: Object.fromEntries(url.searchParams.entries())
  };

  const result = await handleEvent(event);
  return new Response(result.body, {
    status: result.statusCode,
    headers: result.headers
  });
}
