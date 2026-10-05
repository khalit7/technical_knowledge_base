// Chrome over HTTP/1.1: how many EventSource streams to one host open at once, and what a plain fetch does
// while they are all open. Usage: node six_limit.mjs <base url> <html_utils node_modules dir>
import { createRequire } from 'module';
const [BASE, HNM] = process.argv.slice(2);
const puppeteer = createRequire(HNM + '/')('puppeteer');
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`${BASE}/log`);
const r = await page.evaluate(() => new Promise(res => {
  const t0 = performance.now(); const T = () => Math.round(performance.now() - t0) / 1000;
  const opened = []; const list = [];
  for (let i = 0; i < 8; i++) {
    const es = new EventSource(`/sse?think=4&n=2&gap=0.5&tag=s${i}`); list.push(es);
    es.onopen = () => opened.push([i + 1, T()]);
  }
  let fetchAt = null;
  setTimeout(() => { const t = T(); fetch('/log').then(() => { fetchAt = [t, T()] }) }, 300);
  setTimeout(() => { list.forEach(e => e.close()); res({ opened, fetch_started_and_done: fetchAt }) }, 3500);
}));
r.chrome = (await browser.version()).replace('HeadlessChrome/', '');
await browser.close();
console.log(JSON.stringify(r, null, 1));
