import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('CRM admin: import, pipeline, activity, inbound lead and customer conversion', async () => {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-crm-test-'));
  process.env.NOVA_DATA_DIR = testDataDir;
  process.env.NODE_ENV = 'test';

  try {
    const auth = await import('../api/admin/_auth.js');
    process.env.ADMIN_PASSWORD_HASH = auth.hashPassword('Nova-Test-Password-2026');
    const [{ default: handler }, store] = await Promise.all([
      import('../api/admin/index.js'),
      import('../api/admin/_store.js')
    ]);

    let cookie = '';
    const call = async (adminPath, method = 'GET', body = {}, authenticated = true) => {
      const headers = {
        host: 'localhost:8000',
        ...(authenticated && cookie ? { cookie } : {})
      };
      const req = {
        adminPath,
        method,
        body,
        headers,
        socket: { remoteAddress: '127.0.0.1' }
      };
      const responseHeaders = {};
      const result = await new Promise((resolve, reject) => {
        const res = {
          statusCode: 200,
          headersSent: false,
          setHeader(name, value) {
            responseHeaders[String(name).toLowerCase()] = value;
          },
          getHeader(name) {
            return responseHeaders[String(name).toLowerCase()];
          },
          status(code) {
            this.statusCode = code;
            return this;
          },
          json(payload) {
            this.headersSent = true;
            resolve({ status: this.statusCode, payload, headers: responseHeaders });
            return this;
          },
          send(payload) {
            this.headersSent = true;
            resolve({ status: this.statusCode, payload, headers: responseHeaders });
            return this;
          }
        };
        Promise.resolve(handler(req, res)).catch(reject);
      });
      const setCookie = result.headers['set-cookie'];
      if (setCookie) cookie = String(setCookie).split(';')[0];
      return result;
    };

    const login = await call('login', 'POST', { password: 'Nova-Test-Password-2026' }, false);
    assert.equal(login.status, 200);
    assert.match(cookie, /^nova_admin=/);

    const plan = await call('plans/business-complete');
    assert.equal(plan.status, 200);
    assert.match(plan.payload, /<!DOCTYPE html>/i);
    assert.match(plan.headers['content-type'], /^text\/html/);
    assert.match(plan.headers['cache-control'], /no-store/);
    assert.match(plan.headers['x-robots-tag'], /noindex/);

    const firstImport = await call('import-prospects', 'POST');
    assert.equal(firstImport.status, 200);
    assert.equal(firstImport.payload.created, 30);
    assert.equal(firstImport.payload.skipped, 0);

    const duplicateImport = await call('import-prospects', 'POST');
    assert.equal(duplicateImport.payload.created, 0);
    assert.equal(duplicateImport.payload.skipped, 30);

    let bootstrap = await call('bootstrap');
    assert.equal(Object.keys(bootstrap.payload.data.opportunities).length, 30);
    assert.equal(bootstrap.payload.stats.crm.active, 30);
    assert.equal(bootstrap.payload.stats.crm.value, 45000);

    const firstOpportunity = Object.values(bootstrap.payload.data.opportunities)[0];
    const moved = await call(`opportunities/${firstOpportunity.id}`, 'PATCH', { stage: 'contactat' });
    assert.equal(moved.payload.item.stage, 'contactat');
    assert.equal(moved.payload.item.probability, 15);

    const activity = await call('activities', 'POST', {
      opportunityId: firstOpportunity.id,
      type: 'apel',
      occurredAt: `${new Date().toLocaleDateString('en-CA')}T12:00:00`,
      outcome: 'Responsabilul a fost identificat.',
      nextStep: 'Trimite emailul pilot',
      nextActionDate: '2099-01-15',
      createTask: true
    });
    assert.equal(activity.status, 201);
    assert.equal(store.list('activities').length, 1);
    assert.equal(store.list('tasks').length, 1);
    assert.equal(store.get('opportunities', firstOpportunity.id).nextStep, 'Trimite emailul pilot');

    const inboundMessage = store.create('messages', 'b2b', {
      name: 'Ana Pop — Exemplu SRL',
      email: 'ana@example.ro',
      phone: '+40 700 000 000',
      subject: 'Solicitare B2B — pilot pre-retur leasing',
      message: 'Lead de test',
      read: false,
      leadType: 'b2b',
      qualification: {
        company: 'Exemplu SRL',
        contactName: 'Ana Pop',
        role: 'Office Manager',
        email: 'ana@example.ro',
        phone: '+40 700 000 000',
        fleetSize: '11–30 autoturisme',
        leaseReturns: '2–5 autoturisme',
        returnWindow: 'În 31–60 de zile',
        location: 'București',
        lessor: 'Ayvens',
        notes: 'Test'
      }
    });
    const convertedLead = await call(`messages/${inboundMessage.id}/to-opportunity`, 'POST');
    assert.equal(convertedLead.status, 201);
    assert.equal(convertedLead.payload.item.company, 'Exemplu SRL');
    assert.equal(convertedLead.payload.item.priority, 'A');
    assert.equal(store.get('messages', inboundMessage.id).read, true);

    const customerConversion = await call(
      `opportunities/${convertedLead.payload.item.id}/to-customer`,
      'POST'
    );
    assert.equal(customerConversion.status, 201);
    assert.equal(customerConversion.payload.item.type, 'firma');
    assert.equal(customerConversion.payload.opportunity.stage, 'castigat');
    assert.equal(store.list('customers').length, 1);

    bootstrap = await call('bootstrap');
    assert.equal(bootstrap.payload.stats.crm.won, 1);
    assert.equal(bootstrap.payload.stats.crm.touchesThisWeek, 1);

    const unauthorized = await call('bootstrap', 'GET', {}, false);
    assert.equal(unauthorized.status, 401);
  } finally {
    fs.rmSync(testDataDir, { recursive: true, force: true });
    delete process.env.NOVA_DATA_DIR;
    delete process.env.ADMIN_PASSWORD_HASH;
  }
});
