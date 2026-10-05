// fetch is built in (Node 18+): the same API as in browsers. A local server stands in for a JSON API.
import { createServer } from "node:http";
const server = createServer((req, res) => {
  let body = "";
  req.on("data", c => body += c).on("end", () => {
    if (req.url === "/fail") { res.writeHead(503).end("overloaded"); return; }
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ echo: JSON.parse(body || "{}"), method: req.method }));
  });
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const res = await fetch(`${base}/v1/chat`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ model: "small", messages: [{ role: "user", content: "hi" }] }),
});
console.log(res.status, res.ok, res.headers.get("content-type"));
console.log(JSON.stringify(await res.json()));
const bad = await fetch(`${base}/fail`);           // an HTTP error status does NOT throw: check res.ok yourself
console.log(bad.status, bad.ok, await bad.text());
server.close();
const gone = createServer().listen(0), port = gone.address().port; gone.close();   // a port nobody listens on
try { await fetch(`http://127.0.0.1:${port}/v1/chat`); }   // only network failures throw
catch (e) { console.log(e.name, e.message, "| cause:", e.cause?.code); }
