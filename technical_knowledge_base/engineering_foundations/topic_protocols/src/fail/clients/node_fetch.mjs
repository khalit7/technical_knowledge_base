// Node fetch (undici) client: node node_fetch.mjs URL [jsonfile]. CA via NODE_EXTRA_CA_CERTS.
// TIMEOUT_MS=n aborts after n ms (AbortSignal.timeout); without it undici waits up to 300 s for headers.
// Prints status and body, or the error and its cause, the two lines a log usually shows.
import { readFileSync } from 'node:fs';
const [url, json] = process.argv.slice(2);
try {
  const opt = json ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: readFileSync(json) } : {};
  if (process.env.TIMEOUT_MS) opt.signal = AbortSignal.timeout(+process.env.TIMEOUT_MS);
  const r = await fetch(url, opt);
  console.log(r.status, r.statusText);
  console.log((await r.text()).trimEnd());
} catch (e) {
  console.log(`${e.name}: ${e.message}`);
  if (e.cause) console.log(`  cause: ${e.cause.code ? e.cause.code + ' ' : ''}${e.cause.message}`);
}
