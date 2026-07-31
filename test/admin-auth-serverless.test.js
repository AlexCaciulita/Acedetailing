import test from 'node:test';
import assert from 'node:assert/strict';
import {
  currentSession,
  hashPassword,
  login
} from '../api/admin/_auth.js';

function responseMock() {
  const headers = new Map();
  return {
    setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
    getHeader(name) { return headers.get(String(name).toLowerCase()); }
  };
}

test('Netlify admin session is signed and survives without the in-memory session map', () => {
  const previousNetlify = process.env.NETLIFY;
  const previousHash = process.env.ADMIN_PASSWORD_HASH;

  try {
    process.env.NETLIFY = 'true';
    process.env.ADMIN_PASSWORD_HASH = hashPassword('Nova-Test-Password-2026');

    const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const res = responseMock();
    assert.deepEqual(login(req, res, 'Nova-Test-Password-2026'), { ok: true });

    const setCookie = res.getHeader('set-cookie');
    assert.match(setCookie, /^nova_admin=/);
    const cookie = setCookie.split(';')[0];
    assert.ok(currentSession({ headers: { cookie } }));

    const tampered = `${cookie}x`;
    assert.equal(currentSession({ headers: { cookie: tampered } }), null);
  } finally {
    if (previousNetlify === undefined) delete process.env.NETLIFY;
    else process.env.NETLIFY = previousNetlify;
    if (previousHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = previousHash;
  }
});
