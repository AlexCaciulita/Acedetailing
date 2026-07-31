/* Authentication for the admin dashboard.

   Design rules, in order of importance:
   1. FAIL CLOSED. With no ADMIN_PASSWORD_HASH configured the admin API refuses
      every request. There is no default password and no "open in development"
      escape hatch — this data is customer PII on a public origin.
   2. No plaintext password is ever stored or logged. scrypt + per-password salt,
      compared in constant time.
   3. Sessions live in memory only. A restart logs everyone out, which is the
      safe direction to fail.

   Generate the hash with:  node scripts/admin-password.js */

import crypto from 'crypto';

const COOKIE = 'nova_admin';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;        // one working day
const IDLE_TTL_MS = 60 * 60 * 1000;               // re-auth after an hour idle
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

const sessions = new Map();
const attempts = new Map();

const isProduction = () => process.env.NODE_ENV === 'production';
const usesStatelessSessions = () => process.env.NETLIFY === 'true' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

/* ── password hashing ─────────────────────────────────────────────────────── */

export function hashPassword(password, salt = crypto.randomBytes(16)) {
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, saltHex, hashHex] = String(stored).split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

    const expected = Buffer.from(hashHex, 'hex');
    const derived = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    // timingSafeEqual throws on length mismatch, hence deriving to expected.length.
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function isConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD_HASH);
}

/* ── brute-force throttling ───────────────────────────────────────────────── */

function clientKey(req) {
  // Behind a proxy, trust the first hop only if one is configured.
  const forwarded = process.env.TRUST_PROXY === '1' ? req.headers['x-forwarded-for'] : null;
  return String(forwarded || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

export function isLockedOut(req) {
  const entry = attempts.get(clientKey(req));
  if (!entry) return false;
  if (Date.now() - entry.first > LOCKOUT_MS) {
    attempts.delete(clientKey(req));
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(req) {
  const key = clientKey(req);
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > LOCKOUT_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

function clearFailures(req) {
  attempts.delete(clientKey(req));
}

/* ── sessions ─────────────────────────────────────────────────────────────── */

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function setCookie(res, value, maxAgeSeconds) {
  const bits = [
    `${COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`
  ];
  if (isProduction()) bits.push('Secure');
  res.setHeader('Set-Cookie', bits.join('; '));
}

function createSignedToken(now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ created: now })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.ADMIN_PASSWORD_HASH)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifySignedToken(token) {
  try {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature || !process.env.ADMIN_PASSWORD_HASH) return null;

    const expected = crypto
      .createHmac('sha256', process.env.ADMIN_PASSWORD_HASH)
      .update(payload)
      .digest('base64url');
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const created = Number(parsed.created);
    const now = Date.now();
    if (!Number.isFinite(created) || created > now + 60_000 || now - created > SESSION_TTL_MS) return null;
    return { created, seen: created };
  } catch {
    return null;
  }
}

export function startSession(req, res) {
  const now = Date.now();
  const token = usesStatelessSessions()
    ? createSignedToken(now)
    : crypto.randomBytes(32).toString('base64url');
  if (!usesStatelessSessions()) sessions.set(token, { created: now, seen: now });
  setCookie(res, token, Math.floor(SESSION_TTL_MS / 1000));
  clearFailures(req);
  return token;
}

export function endSession(req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token) sessions.delete(token);
  setCookie(res, '', 0);
}

export function currentSession(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;

  // A serverless request may land on a different function instance, so its
  // session cannot depend on an in-memory Map. The signed cookie is still
  // HttpOnly, SameSite=Strict and expires after one working day.
  if (usesStatelessSessions()) return verifySignedToken(token);

  const session = sessions.get(token);
  if (!session) return null;

  const now = Date.now();
  if (now - session.created > SESSION_TTL_MS || now - session.seen > IDLE_TTL_MS) {
    sessions.delete(token);
    return null;
  }

  session.seen = now;
  return session;
}

export function login(req, res, password) {
  if (!isConfigured()) return { ok: false, status: 503, message: 'Autentificarea nu este configurată pe server.' };
  if (isLockedOut(req)) return { ok: false, status: 429, message: 'Prea multe încercări. Reîncearcă peste 15 minute.' };

  if (!password || !verifyPassword(password, process.env.ADMIN_PASSWORD_HASH)) {
    recordFailure(req);
    // Deliberately vague: no hint about which part was wrong.
    return { ok: false, status: 401, message: 'Parolă incorectă.' };
  }

  startSession(req, res);
  return { ok: true };
}

/* ── request guard ────────────────────────────────────────────────────────── */

// SameSite=Strict already blocks cross-site cookie sends; the Origin check is a
// second layer for browsers that ignore it and for non-GET requests generally.
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;                       // same-origin fetches omit it
  try {
    const host = req.headers.host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Returns null when the request may proceed, or a {status, message} to send.
 */
export function guard(req) {
  if (!isConfigured()) {
    return {
      status: 503,
      message: 'Panoul de administrare nu este configurat. Rulează: node scripts/admin-password.js'
    };
  }

  if (!currentSession(req)) {
    return { status: 401, message: 'Neautentificat.' };
  }

  if (req.method !== 'GET' && !originAllowed(req)) {
    return { status: 403, message: 'Origine invalidă.' };
  }

  return null;
}
