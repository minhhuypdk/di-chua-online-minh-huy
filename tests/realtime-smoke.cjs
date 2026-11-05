// Run with an externally installed Playwright: node tests/realtime-smoke.cjs
// Requires the app server at TEMPLE_TEST_URL (default http://127.0.0.1:8000).
// This deterministic Phoenix server simulation does NOT validate live Supabase.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.TEMPLE_TEST_URL || 'http://127.0.0.1:8000';
const sockets = new Set();
let failBroadcast = false;
let delayImport = false;
let presenceRef = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function roomState(topic) {
  const state = {};
  for (const s of sockets) if (s.topic === topic && s.presence) state[s.key] = { metas: [s.presence] };
  return state;
}
function sync(topic) {
  for (const s of sockets) if (s.topic === topic) s.push('presence_state', roomState(topic));
}
function remove(s) {
  const topic = s.topic;
  sockets.delete(s);
  if (topic) sync(topic);
}
async function setup(context) {
  await context.addInitScript(() => {
    window.__drawnLabels = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
      window.__drawnLabels.push(text);
      return fillText.call(this, text, ...args);
    };
  });
  // Expose scene state only in the test response; production code has no test globals.
  await context.route(base + '/**', async route => {
    if (new URL(route.request().url()).pathname !== '/') return route.continue();
    const response = await route.fetch();
    const html = (await response.text()).replace('</script></body>',
      ';window.__sceneTest={visitors,hero};</script></body>');
    await route.fulfill({ response, body: html });
  });
  await context.route('https://esm.sh/@supabase/supabase-js@2.119.0', async route => {
    if (delayImport) await sleep(1200);
    await route.continue();
  });
  await context.routeWebSocket('wss://zzphwbedtxbhajkpavqp.supabase.co/**', ws => {
    const s = { topic: null, key: null, presence: null, array: false, joinRef: null };
    sockets.add(s);
    s.push = (event, payload, ref = null) => ws.send(JSON.stringify(s.array
      ? [s.joinRef, ref, s.topic, event, payload]
      : { topic: s.topic, event, payload, ref }));
    ws.onMessage(raw => {
      let frame;
      if (typeof raw === 'string') frame = JSON.parse(raw);
      else {
        // Realtime protocol 2 encodes outgoing user broadcasts in binary.
        const bytes = Buffer.from(raw); let offset = 7;
        const read = n => { const text = bytes.subarray(offset, offset+n).toString(); offset += n; return text; };
        const joinRef = read(bytes[1]), ref = read(bytes[2]), topic = read(bytes[3]);
        const event = read(bytes[4]); read(bytes[5]);
        assert.equal(bytes[6], 1); // JSON encoding
        frame = [joinRef, ref, topic, 'broadcast', { event, payload: JSON.parse(bytes.subarray(offset).toString()) }];
      }
      s.array = Array.isArray(frame);
      const [joinRef, ref, topic, event, payload] = s.array
        ? frame : [null, frame.ref, frame.topic, frame.event, frame.payload];
      if (event === 'phx_join') {
        s.topic = topic; s.joinRef = joinRef; s.key = payload.config.presence.key;
        assert.equal(topic, 'realtime:temple:CHUA-MINHHUY');
        assert.equal(payload.config.broadcast.ack, true);
        s.push('phx_reply', { status: 'ok', response: { postgres_changes: [] } }, ref);
        sync(topic);
      } else if (event === 'presence') {
        s.presence = { ...payload.payload, phx_ref: String(++presenceRef) };
        s.push('phx_reply', { status: 'ok', response: {} }, ref);
        sync(topic);
      } else if (event === 'broadcast') {
        s.push('phx_reply', { status: failBroadcast ? 'error' : 'ok', response: {} }, ref);
        if (!failBroadcast) for (const peer of sockets) {
          if (peer !== s && peer.topic === topic) peer.push('broadcast', payload);
        }
      } else if (event === 'phx_leave') {
        s.push('phx_reply', { status: 'ok', response: {} }, ref);
        remove(s);
      } else if (event === 'heartbeat') {
        ws.send(JSON.stringify(s.array ? [null, ref, 'phoenix', 'phx_reply', { status: 'ok', response: {} }]
          : { topic: 'phoenix', event: 'phx_reply', ref, payload: { status: 'ok', response: {} } }));
      }
    });
    ws.onClose(() => remove(s));
  });
}
async function enter(page, nick) {
  await page.goto(base);
  await page.waitForFunction(() => !!window.__sceneTest);
  await page.locator('#nick').fill(nick);
  await page.locator('#enter').click();
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
    ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } } : {}) });
  try {
    const errors = [];
    const a = await browser.newContext({viewport:{width:640,height:480},deviceScaleFactor:1}), b = await browser.newContext({viewport:{width:640,height:480},deviceScaleFactor:1});
    a.setDefaultTimeout(20000); b.setDefaultTimeout(20000);
    await setup(a); await setup(b);
    const p = await a.newPage(), q = await b.newPage();
    for (const page of [p,q]) page.on('pageerror', e => errors.push(e.message));
    await enter(p, 'Test-A'); await enter(q, 'Test-B');
    for (const page of [p,q]) {
      await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Đã kết nối'));
      await page.waitForFunction(() => document.querySelector('#online').textContent.includes('Online: 2'));
      assert.equal(await page.evaluate(() => window.__sceneTest.visitors.size), 1);
      assert.ok((await page.locator('#online').textContent()).includes('Test-A'));
      assert.ok((await page.locator('#online').textContent()).includes('Test-B'));
      await page.locator('#toggle').click();
    }
    assert.ok(await p.evaluate(() => window.__drawnLabels.includes('Test-B')));
    assert.ok(await q.evaluate(() => window.__drawnLabels.includes('Test-A')));
    const before = await q.evaluate(() => [...window.__sceneTest.visitors.values()][0].position.x);
    await p.keyboard.down('d'); await sleep(600); await p.keyboard.up('d');
    await q.waitForFunction(x => [...window.__sceneTest.visitors.values()][0].position.x > x, before);
    assert.equal(await q.evaluate(() => [...window.__sceneTest.visitors.values()][0].rotation.y), Math.PI/2);
    const otherBefore = await p.evaluate(() => [...window.__sceneTest.visitors.values()][0].position.z);
    await q.keyboard.down('w'); await sleep(600); await q.keyboard.up('w');
    await p.waitForFunction(z => [...window.__sceneTest.visitors.values()][0].position.z < z, otherBefore);
    const text = 'Lời chúc bình an dài hơn bốn mươi ký tự để kiểm tra chat không bị cắt mất nội dung.';
    await p.locator('#message').fill(text); await p.locator('#send').click();
    await q.waitForFunction(t => document.querySelector('#messages').textContent.includes(t), text);
    await q.locator('#message').fill('Chào Test-A'); await q.locator('#send').click();
    await p.waitForFunction(() => document.querySelector('#messages').textContent.includes('Chào Test-A'));
    await p.locator('[data-action="bell"]').click();
    await q.waitForFunction(() => document.querySelector('#messages').textContent.includes('đã thỉnh chuông'));
    assert.equal(await p.locator('#score').textContent(), '1 xu bình an');
    failBroadcast = true;
    await p.locator('#message').fill('Tin không gửi được'); await p.locator('#send').click();
    await p.waitForFunction(() => document.querySelector('#notice').textContent.includes('Chưa gửi được'));
    assert.equal(await p.locator('#message').inputValue(), 'Tin không gửi được');
    assert.ok(!(await p.locator('#messages').textContent()).includes('Tin không gửi được'));
    failBroadcast = false;
    await q.locator('#leave').click();
    await p.waitForFunction(() => window.__sceneTest.visitors.size === 0);
    await p.waitForFunction(() => document.querySelector('#online').textContent.includes('Online: 1'));
    await q.locator('#nick').fill('Test-B-Return'); await q.locator('#enter').click();
    await p.waitForFunction(() => document.querySelector('#online').textContent.includes('Test-B-Return'));
    const c = await browser.newContext({viewport:{width:640,height:480},deviceScaleFactor:1}); await setup(c);
    const r = await c.newPage(); delayImport = true;
    await enter(r, 'Leave-Before-Import'); await r.locator('#leave').click();
    await sleep(1800);
    assert.ok(await r.locator('#gate').isVisible());
    assert.equal(await r.evaluate(() => window.__sceneTest.visitors.size), 0);
    assert.equal(sockets.size, 2);
    assert.deepEqual(errors, []);
    console.log('PASS (SIMULATED server, real pinned SDK): two isolated browser contexts; Presence avatars/names/movement; bidirectional chat; activity; failed-send feedback; leave/rejoin; leave during CDN import.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
