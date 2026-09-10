import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const temp = await mkdtemp(path.join(tmpdir(), 'openreactions-test-'));
const mock = path.join(here, 'sync-backend.js');
await build({ entryPoints: [path.join(here, 'document-sync.browser.jsx')], bundle: true, format: 'esm', outfile: path.join(temp, 'tests.js'), plugins: [{ name: 'mock-cloud', setup(build) {
  build.onResolve({ filter: /\/lib\/(supabase|documents)\.js$/ }, () => ({ path: mock }));
} }] });
let libraryFixture = false;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.searchParams.has('library-fixture')) libraryFixture = true;
    if (url.pathname === '/__tests') libraryFixture = false;
    if (libraryFixture && url.pathname === '/supabase-config.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end('window.OPENREACTIONS_CONFIG = { supabaseUrl: "https://example.test", supabaseAnonKey: "fixture", enableGoogleSignIn: false };');
      return;
    }
    if (libraryFixture && url.pathname === '/vendor/supabase.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(`window.supabase = { createClient: () => ({ auth: { getSession: async () => ({ data: { session: { user: { email: 'chemist@example.test' } } } }), onAuthStateChange: () => ({}) }, from: () => { const query = { select: () => query, order: () => query, range: async (start, end) => ({ data: Array.from({ length: 105 }, (_, i) => ({ id: 'drawing-' + i, title: 'Reaction ' + String(i).padStart(3, '0'), updated_at: new Date(2026, 0, 1 + i).toISOString() })).slice(start, end + 1) }) }; return query; } }) };`);
      return;
    }
    if (url.pathname === '/__tests') { res.setHeader('Content-Type', 'text/html'); res.end('<div id="root"></div><script type="module" src="/__tests.js"></script>'); return; }
    const name = url.pathname === '/__tests.js' ? path.join(temp, 'tests.js') : path.join(repo, url.pathname.startsWith('/draw/') ? `draw/dist/${url.pathname.slice(6) || 'index.html'}` : url.pathname === '/' ? 'index.html' : url.pathname);
    if (!name.startsWith(repo + path.sep) && name !== path.join(temp, 'tests.js')) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' })[path.extname(name)] || 'application/octet-stream');
    res.end(await readFile(name));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const chromePath = process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const chrome = spawn(chromePath, ['--headless', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${temp}/chrome`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let ws;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Chrome startup timed out')), 15000);
    chrome.on('error', e => { clearTimeout(timeout); reject(e); });
    chrome.stderr.on('data', chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timeout); resolve(match[1]); } });
  });
  const tabs = await (await fetch(`http://${new URL(endpoint).host}/json`)).json();
  ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map(); const exceptions = [];
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails); });
  const call = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
  const until = async expression => { for (let i = 0; i < 100; i++) { const value = await evaluate(expression); if (value) return value; await new Promise(r => setTimeout(r, 50)); } throw new Error(`Timed out: ${expression}`); };
  await call('Runtime.enable'); await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: base });
  await until('document.querySelector("#account-slot button")');
  await evaluate('document.querySelector("#account-slot button").click()');
  assert.equal(await evaluate('document.querySelector("#auth-overlay").hidden'), false);
  await until('getComputedStyle(document.querySelector(".auth-tab.active")).color === "rgb(255, 255, 255)"');
  await evaluate('document.querySelector("#tab-signup").click()');
  await until('getComputedStyle(document.querySelector(".auth-tab.active")).color === "rgb(255, 255, 255)"');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  assert.equal(await evaluate('document.querySelector("#auth-overlay").hidden'), true);
  await writeFile(path.join(temp, 'home.png'), Buffer.from((await call('Page.captureScreenshot')).data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Mobile page overflows');
  assert.equal(await evaluate('document.querySelector("#account-slot button").getBoundingClientRect().right <= innerWidth'), true, 'Mobile sign-in is clipped');
  await writeFile(path.join(temp, 'mobile.png'), Buffer.from((await call('Page.captureScreenshot')).data, 'base64'));
  console.log('PASS: Homepage sign-in, modal, Escape, mobile layout');
  await call('Page.navigate', { url: `${base}/?library-fixture=1` });
  await until(`document.querySelectorAll('.drawing-card').length === 105`);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.drawing-card')).every(a => new URL(a.href).searchParams.has('_open') && new URL(a.href).searchParams.has('doc'))`), true, 'Saved drawing links must refresh the editor shell without dropping document IDs');
  await evaluate(`document.querySelector('#drawing-search').value = 'Reaction 104'; document.querySelector('#drawing-search').dispatchEvent(new Event('input'))`);
  assert.equal(await evaluate(`document.querySelectorAll('.drawing-card').length`), 1);
  await evaluate(`document.querySelector('#drawing-search').value = ''; document.querySelector('#drawing-search').dispatchEvent(new Event('input')); document.querySelector('#drawing-sort').value = 'name'; document.querySelector('#drawing-sort').dispatchEvent(new Event('change'))`);
  assert.equal(await evaluate(`document.querySelector('.drawing-name').textContent`), 'Reaction 000');
  await evaluate(`document.querySelector('#view-list').click()`);
  assert.equal(await evaluate(`!!document.querySelector('.list-view')`), true);
  await evaluate(`document.querySelector('#nav-about').click()`);
  assert.equal(await evaluate(`document.querySelector('#library-page').hidden && !document.querySelector('#about-page').hidden`), true);
  await evaluate(`document.querySelector('#nav-drawings').click(); document.querySelector('#view-grid').click()`);
  await writeFile(path.join(temp, 'library-mobile.png'), Buffer.from((await call('Page.captureScreenshot')).data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await writeFile(path.join(temp, 'library.png'), Buffer.from((await call('Page.captureScreenshot')).data, 'base64'));
  console.log('PASS: Full library pagination, search, sorting, grid/list views, and About navigation');
  await call('Page.navigate', { url: `${base}/__tests` });
  const results = await until('window.__testResults');
  for (const test of results) console.log(`${test.passed ? 'PASS' : 'FAIL'}: ${test.name}${test.error ? ` — ${test.error}` : ''}`);
  assert(results.every(t => t.passed), 'Persistence regression failed');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  // A month-old saved document has no drawingStyle or newer optional fields.
  const oldId = '33333333-3333-4333-8333-333333333333';
  await evaluate(`localStorage.clear(); localStorage.setItem('openreactions.draft.${oldId}', JSON.stringify({ title: 'Month-old drawing', updatedAt: '2026-08-01T00:00:00Z', doc: { version: 1, vertices: [{x: 300, y: 300}, {x: 360, y: 300}], segments: [{x1: 300, y1: 300, x2: 360, y2: 300, bondOrder: 1}], vertexAtoms: {'360.00,300.00': {symbol: 'O', charge: -1}}, arrows: [] } }))`);
  await call('Page.navigate', { url: `${base}/draw/?doc=${oldId}&_open=regression` });
  await until(`document.body?.innerText.includes('Month-old drawing') && !!document.querySelector('.editor-menu-trigger')`);
  assert.equal(await evaluate(`new URL(location.href).searchParams.get('doc')`), oldId);
  const restored = await evaluate(`JSON.parse(localStorage.getItem('openreactions.draft.${oldId}')).doc`);
  assert.equal(restored.segments.length, 1);
  assert.equal(restored.vertexAtoms['360.00,300.00'].charge, -1);
  await evaluate(`document.querySelector('.editor-menu-trigger').click()`);
  await until(`!!document.querySelector('[aria-label="Tools"][role="dialog"]')`);
  assert.equal(await evaluate(`document.body.innerText.includes('Tidy structure')`), true);
  console.log('PASS: Month-old drawing opens in the current Tools UI with its identity, bonds, and atom labels preserved');
  await evaluate(`localStorage.clear()`);
  await call('Page.navigate', { url: `${base}/draw/` });
  await until('!!document.querySelector("canvas")');
  assert.equal(await evaluate('!!Array.from(document.querySelectorAll("button")).find(b => b.innerText === "Sign in")'), true);
  await writeFile(path.join(temp, 'editor.png'), Buffer.from((await call('Page.captureScreenshot')).data, 'base64'));
  await until('document.body?.innerText.includes("Saved on this device")');
  await evaluate(`document.querySelector('[title="Benzene ring (R)"]').click()`);
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400 });
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 400, button: 'left', clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 400, button: 'left', clickCount: 1 });
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local') || '{}').doc?.segments?.length === 6`);
  await evaluate(`document.querySelector('.editor-menu-trigger').click()`);
  await until(`!!document.querySelector('[aria-label="Tools"][role="dialog"]')`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Tidy structure').click()`);
  try { await until(`document.body.textContent.includes('Structure tidied.')`); } catch (error) { console.log(await evaluate(`document.body.innerText`)); throw error; }
  await evaluate(`window.__svgBlob = null; const createUrl = URL.createObjectURL.bind(URL); URL.createObjectURL = blob => { if (blob.type === 'image/svg+xml') window.__svgBlob = blob; return createUrl(blob); }; Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Export SVG').click()`);
  await until(`window.__svgBlob !== null`);
  const svg = await evaluate(`window.__svgBlob.text()`);
  assert(svg.includes('<path') && !svg.includes('<image'), 'SVG must contain vector geometry');
  assert.equal(await evaluate(`(async () => (new DOMParser()).parseFromString(await window.__svgBlob.text(), 'image/svg+xml').querySelector('parsererror') === null)()`), true);
  console.log('PASS: Tidy structure and valid vector SVG export');
  await writeFile(path.join(temp, 'tools-menu.png'), Buffer.from((await call('Page.captureScreenshot')).data, 'base64'));
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  assert.equal(await evaluate(`document.querySelector('[aria-label="Tools"][role="dialog"]') === null`), true);
  await evaluate(`Array.from(document.querySelectorAll('.editor-menu-trigger')).find(b => b.textContent.includes('Elements')).click()`);
  await until(`!!document.querySelector('[aria-label="Elements"][role="dialog"]')`);
  assert.equal(await evaluate(`document.querySelector('.element-help').textContent.includes('Choose an element')`), true);
  await writeFile(path.join(temp, 'elements-menu.png'), Buffer.from((await call('Page.captureScreenshot')).data, 'base64'));
  await evaluate(`Array.from(document.querySelectorAll('.element-grid button')).find(b => b.textContent === 'N').click()`);
  await until(`document.querySelector('[aria-label="Elements"][role="dialog"]') === null`);
  console.log('PASS: Selected auth tab contrast, Tools dismissal, and element pop-out selection');
  await evaluate(`document.querySelector('[title="Rename this drawing"]').click()`);
  await evaluate(`(() => { const input = document.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Benzene study'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter' });
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local') || '{}').title === 'Benzene study'`);
  await call('Page.reload');
  await until(`document.body?.innerText.includes('Benzene study')`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.segments.length`), 6);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'Export').click()`);
  await until(`document.querySelector('img[alt="Molecular structure preview"]')?.naturalWidth > 0`);
  const exported = await evaluate(`(() => { const image = document.querySelector('img[alt="Molecular structure preview"]'); return { width: image.naturalWidth, height: image.naturalHeight }; })()`);
  assert(exported.width > 100 && exported.height > 100, 'Export image is unexpectedly small');
  await writeFile(path.join(temp, 'export.png'), Buffer.from((await call('Page.captureScreenshot')).data, 'base64'));
  console.log('PASS: Draw benzene, rename, reload recovery, and PNG export');
  assert.deepEqual(exceptions, [], 'Browser runtime exceptions');
  console.log(`PASS: Production editor renders without runtime errors\nScreenshots: ${temp}`);
} finally { ws?.close(); chrome.kill('SIGKILL'); server.close(); server.closeAllConnections(); }
