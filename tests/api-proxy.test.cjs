const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { buildSync } = require('esbuild');
function load(file) {
  const output = buildSync({ entryPoints: [path.join(__dirname, '../frontend/src', file)], tsconfig: path.join(__dirname, '../frontend/tsconfig.json'), bundle: true, platform: 'node', format: 'cjs', write: false });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}
const { proxy, allowed } = load('lib/server/api-proxy.ts');
const callback = load('app/api/v1/auth/google/callback/route.ts');
const { verifyAdminAccess } = load('lib/server/admin-access.ts');

test('API boundary: rejects unsupported routes and cross-origin mutations before upstream I/O', async () => {
  const previous = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('Unexpected upstream'); };
  try {
    assert.equal(allowed('POST', 'webhooks/sepay'), false);
    assert.equal(allowed('GET', 'internal/metrics'), false);
    assert.equal(allowed('GET', 'admin/orders'), true);
    for (const route of ['market/latest', 'market/candles', 'portfolio']) assert.equal(allowed('GET', route), true, route);
    assert.equal(allowed('PUT', 'portfolio'), true);
    assert.equal(allowed('DELETE', 'portfolio'), false);
    assert.equal(allowed('GET', 'market/other'), false);
    assert.equal(allowed('POST', 'analyses'), true);
    assert.equal(allowed('GET', 'analyses/options'), true);
    assert.equal(allowed('GET', 'analyses/job-id'), true);
    assert.equal(allowed('GET', 'reports/report-id'), true);
    assert.equal(allowed('POST', 'analyses/job-id/cancel'), false);
    assert.equal(allowed('POST', 'admin/screening/backfills'), true);
    assert.equal(allowed('GET', 'admin/screening/backfill-options'), true);
    assert.equal(allowed('GET', 'admin/scheduled-tasks/task-id'), true);
    assert.equal(allowed('POST', 'admin/scheduled-tasks/task-id'), false);
    assert.equal(allowed('GET', 'screenings/latest'), true);
    assert.equal(allowed('GET', 'screenings/run-id/results'), true);
    assert.equal(allowed('GET', 'screenings/run-id/symbols/FPT'), true);
    assert.equal(allowed('POST', 'screenings/run-id/symbols/FPT'), false);
    assert.equal(allowed('GET', 'screenings/run-id/symbols/../admin'), false);
    assert.equal(allowed('POST', 'screenings/run-id/results'), false);
    assert.equal(allowed('GET', 'admin/orders/123-test'), true);
    assert.equal(allowed('POST', 'admin/orders/123-test/paid'), false);
    assert.equal(allowed('GET', '../admin/users'), false);
    assert.equal(allowed('POST', 'admin/users/a/delete'), false);
    assert.equal(allowed('POST', 'admin/jobs/a/quota-refund'), false);
    assert.equal(allowed('POST', 'admin/configs/OPERATIONS/' + 'a'.repeat(64) + '/activate'), true);
    assert.equal((await proxy(new Request('http://localhost:3000/api/v1/orders', { method: 'POST', headers: { Origin: 'https://evil.example' } }), 'orders')).status, 403);
    assert.equal((await proxy(new Request('http://localhost:3000/api/v1/orders', { method: 'POST' }), 'orders')).status, 403);
    assert.equal((await proxy(new Request('http://localhost:3000/api/v1/webhooks/sepay', { method: 'POST' }), 'webhooks/sepay')).status, 404);
    assert.equal(calls, 0);
  } finally { global.fetch = previous; }
});

test('Refresh proxy isolates role cookies and preserves multiple Set-Cookie, CSRF upstream Origin, and no-store', async () => {
  const previous = global.fetch;
  let seen;
  global.fetch = async (url, init) => {
    seen = { url: String(url), init };
    const headers = new Headers({ 'Content-Type': 'application/json', 'X-Request-ID': 'fixture-request' });
    headers.append('Set-Cookie', 'quantik_admin_refresh=new; HttpOnly; Path=/api/v1/admin/auth; SameSite=Strict');
    headers.append('Set-Cookie', 'other=value; HttpOnly; Path=/api/v1/admin/auth');
    return new Response(JSON.stringify({ access_token: 'fixture', expires_in: 900 }), { headers });
  };
  try {
    const result = await proxy(new Request('http://localhost:3000/api/v1/admin/auth/refresh', { method: 'POST', headers: { Origin: 'http://localhost:3000', 'X-Real-IP': '203.0.113.10', Cookie: 'quantik_admin_refresh=old; quantik_user_refresh=private; unrelated=value' } }), 'admin/auth/refresh');
    assert.equal(result.status, 200);
    assert.equal(seen.init.headers.get('cookie'), 'quantik_admin_refresh=old');
    assert.equal(seen.init.headers.get('origin'), 'http://localhost:8000');
    assert.equal(seen.init.headers.get('x-real-ip'), '203.0.113.10');
    assert.equal(seen.init.redirect, 'manual');
    assert.equal(result.headers.getSetCookie().length, 3);
    assert.match(result.headers.getSetCookie()[2], /quantik_admin_gate=fixture; Path=\/admin; HttpOnly; SameSite=Strict; Max-Age=900/);
    assert.match(result.headers.getSetCookie()[0], /HttpOnly/);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.equal(result.headers.get('X-Request-ID'), 'fixture-request');
  } finally { global.fetch = previous; }
});

test('Order proxy preserves payload and idempotency key; upstream redirect/outage is not followed', async () => {
  const previous = global.fetch;
  global.fetch = async (url, init) => {
    assert.equal(init.headers.get('Idempotency-Key'), 'same-intent');
    assert.deepEqual(JSON.parse(init.body), { plan_id: 'fixture-plan' });
    assert.equal(init.headers.get('Authorization'), 'Bearer fixture');
    return new Response(null, { status: 302, headers: { Location: 'https://unexpected.example' } });
  };
  try {
    const request = () => new Request('http://localhost:3000/api/v1/orders', { method: 'POST', headers: { Origin: 'http://localhost:3000', Authorization: 'Bearer fixture', 'Idempotency-Key': 'same-intent' }, body: JSON.stringify({ plan_id: 'fixture-plan' }) });
    assert.equal((await proxy(request(), 'orders')).status, 502);
    global.fetch = async () => { throw new Error('private upstream detail'); };
    const result = await proxy(request(), 'orders');
    assert.deepEqual(await result.json(), { code: 'BACKEND_UNAVAILABLE' });
  } finally { global.fetch = previous; }
});

test('Google callback exchanges with the browser-bound cookie; redirects without bearer or exchange code', async () => {
  const previous = global.fetch;
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push(String(url));
    assert.equal(init.headers.get('Cookie'), 'quantik_oauth_browser=browser-fixture');
    if (calls.length === 1) return Response.json({ exchange_code: 'sensitive-exchange-fixture' });
    assert.equal(init.headers.get('Origin'), 'http://localhost:8000');
    assert.deepEqual(JSON.parse(init.body), { code: 'sensitive-exchange-fixture' });
    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', 'quantik_user_refresh=refresh-fixture; HttpOnly; Path=/api/v1/auth; SameSite=Strict');
    headers.append('Set-Cookie', 'quantik_oauth_browser=""; Max-Age=0; Path=/api/v1/auth');
    return new Response(JSON.stringify({ access_token: 'sensitive-bearer-fixture' }), { headers });
  };
  try {
    const result = await callback.GET(new Request('http://localhost:3000/api/v1/auth/google/callback?state=state-fixture&code=google-code', { headers: { Cookie: 'unrelated=private; quantik_oauth_browser=browser-fixture' } }));
    assert.equal(result.status, 303);
    assert.equal(result.headers.get('Location'), 'http://localhost:3000/dashboard');
    assert.equal(result.headers.get('Referrer-Policy'), 'no-referrer');
    assert.equal(result.headers.getSetCookie().length, 3);
    assert.match(result.headers.getSetCookie()[2], /quantik_login_event=/);
    assert.equal(await result.text(), '');
    assert.equal(calls.length, 2);
  } finally { global.fetch = previous; }
});

test('Admin page gate validates the current role against BE, never mere cookie presence', async () => {
  const previous = global.fetch;
  let calls = 0;
  global.fetch = async (url, init) => {
    calls++;
    const token = new Headers(init.headers).get('Authorization');
    if (token === 'Bearer valid-admin') return Response.json({ id: 'admin-id', role: 'admin' });
    if (token === 'Bearer valid-customer') return Response.json({ id: 'user-id', role: 'user' });
    return Response.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
  };
  try {
    assert.equal(await verifyAdminAccess(undefined), false);
    assert.equal(calls, 0);
    assert.equal(await verifyAdminAccess('forged-cookie'), false);
    assert.equal(await verifyAdminAccess('revoked-admin'), false);
    assert.equal(await verifyAdminAccess('valid-customer'), false);
    assert.equal(await verifyAdminAccess('valid-admin'), true);
  } finally { global.fetch = previous; }
});

test('Google rejection never attempts token exchange', async () => {
  const previous = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; return Response.json({ code: 'INVALID_OAUTH_STATE' }, { status: 401 }); };
  try {
    const result = await callback.GET(new Request('http://localhost:3000/api/v1/auth/google/callback?state=bad&code=bad'));
    assert.equal(result.headers.get('Location'), 'http://localhost:3000/login?error=google');
    assert.equal(calls, 1);
    await callback.GET(new Request('http://localhost:3000/api/v1/auth/google/callback?error=access_denied'));
    assert.equal(calls, 1);
  } finally { global.fetch = previous; }
});
