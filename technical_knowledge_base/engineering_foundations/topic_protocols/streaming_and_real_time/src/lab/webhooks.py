"""Webhooks: signatures checked with real libraries, then one delivery run with retries, twice.

Usage: python webhooks.py <port>
Part 1, signatures: GitHub's published test vector; Standard Webhooks (library `standardwebhooks`) with a
made-up secret: the raw body verifies, a re-serialised copy does not, an old timestamp does not.
Part 2, delivery: a sender that follows Standard Webhooks' rules (2xx is success, anything else or a
timeout is retried) with its example schedule scaled down 60x (5 s becomes 83 ms) and a 1 s timeout,
delivers two events about one fine-tuning job: job.running, then job.succeeded. The first attempt of
job.running gets a 503 (a deploy). Two receivers:
  naive: verifies, does the work inline (1.5 s, longer than the sender's timeout), stores the payload's status
  careful: verifies, dedupes on webhook-id, answers 200 at once, works from a queue, and re-reads the job's
           state instead of trusting arrival order ("thin payload")
Prints JSON: every delivery attempt and every time work was done.
"""
import asyncio, base64, hashlib, hmac, json, sys, time
from datetime import datetime, timedelta, timezone
import httpx
from aiohttp import web
from standardwebhooks import Webhook

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 30420
out = {"signatures": {}, "delivery": {}}

# ---- Part 1: signatures
sig = hmac.new(b"It's a Secret to Everybody", b"Hello, World!", hashlib.sha256).hexdigest()
out["signatures"]["github_vector"] = {"computed": "sha256=" + sig,
                                      "published": "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17"}
SECRET = "whsec_" + base64.b64encode(b"wirelab-demo-secret-not-real-0001").decode()
wh = Webhook(SECRET)
body = '{"type":"fine_tuning.job.succeeded","data":{"id":"ftjob_wirelab_01","status":"succeeded"}}'
now = datetime.now(tz=timezone.utc)
headers = {"webhook-id": "msg_wirelab_0001", "webhook-timestamp": str(int(now.timestamp())),
           "webhook-signature": wh.sign("msg_wirelab_0001", now, body)}
reser = json.dumps(json.loads(body))           # what a framework hands you after parsing: spaces added


def check(data, hdr):
    try:
        wh.verify(data, hdr); return "verified"
    except Exception as e:
        return f"{type(e).__name__}: {e}"


old = now - timedelta(minutes=10)
old_h = {"webhook-id": "msg_wirelab_0001", "webhook-timestamp": str(int(old.timestamp())),
         "webhook-signature": wh.sign("msg_wirelab_0001", old, body)}
out["signatures"]["standard_webhooks"] = {
    "signed_content": f"msg_wirelab_0001.<timestamp>.{body}", "signature_header_example": headers["webhook-signature"],
    "raw_body": check(body, headers), "reserialised_body": reser, "reserialised": check(reser, headers),
    "ten_minutes_old": check(body, old_h), "library_tolerance": "5 minutes (standardwebhooks/webhooks.py)"}

# ---- Part 2: delivery with retries
SCHEDULE = [0, 5, 300, 1800]                     # seconds: the spec's first delays
SCALE = 60
TIMEOUT = 1.0
JOB = {"status": "succeeded"}                    # the provider's truth, read by the careful receiver


def mkreceiver(mode, log):
    seen, queue, state = set(), asyncio.Queue(), {"status": None}
    fail_first = {"done": False}

    async def worker():
        while True:
            ev = await queue.get()
            await asyncio.sleep(1.5)
            state["status"] = JOB["status"]      # re-read the source of truth
            log.append({"t": now_s(), "what": "work done", "event": ev["type"], "status_stored": state["status"]})

    async def handle(req):
        raw = await req.text()
        wh.verify(raw, dict(req.headers))
        ev = json.loads(raw)
        if ev["type"] == "job.running" and not fail_first["done"]:
            fail_first["done"] = True
            log.append({"t": now_s(), "what": "answered 503 (deploying)", "event": ev["type"]})
            return web.Response(status=503)
        if mode == "naive":
            log.append({"t": now_s(), "what": "work started", "event": ev["type"]})
            await asyncio.sleep(1.5)
            state["status"] = ev["data"]["status"]
            log.append({"t": now_s(), "what": "work done", "event": ev["type"], "status_stored": state["status"]})
            return web.Response(status=200)
        mid = req.headers["webhook-id"]
        if mid in seen:
            log.append({"t": now_s(), "what": "duplicate ignored", "event": ev["type"]})
            return web.Response(status=200)
        seen.add(mid); queue.put_nowait(ev)
        log.append({"t": now_s(), "what": "queued, answered 200", "event": ev["type"]})
        return web.Response(status=200)
    return handle, worker, state


T0 = [0.0]


def now_s():
    return round(time.monotonic() - T0[0], 3)


async def deliver(client, url, mid, ev, log):
    raw = json.dumps(ev, separators=(",", ":"))
    for attempt, delay in enumerate(SCHEDULE):
        await asyncio.sleep(delay / SCALE if attempt else 0)
        ts = datetime.now(tz=timezone.utc)
        h = {"content-type": "application/json", "webhook-id": mid, "webhook-timestamp": str(int(ts.timestamp())),
             "webhook-signature": wh.sign(mid, ts, raw)}
        t = now_s()
        try:
            r = await client.post(url, content=raw, headers=h, timeout=TIMEOUT)
            res = f"HTTP {r.status_code}"
            ok = 200 <= r.status_code < 300
        except httpx.TimeoutException:
            res, ok = f"timeout after {TIMEOUT:.0f} s", False
        log.append({"t": t, "what": f"attempt {attempt + 1}: {res}", "event": ev["type"], "sender": True})
        if ok:
            return


async def run(mode):
    log = []
    handle, worker, state = mkreceiver(mode, log)
    app = web.Application(); app.router.add_post("/hook", handle)
    runner = web.AppRunner(app); await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", PORT); await site.start()
    wtask = asyncio.create_task(worker())
    T0[0] = time.monotonic()
    url = f"http://127.0.0.1:{PORT}/hook"
    async with httpx.AsyncClient() as c:
        await asyncio.gather(
            deliver(c, url, "msg_job_running", {"type": "job.running", "data": {"id": "ftjob_01", "status": "running"}}, log),
            delayed(c, url, log))
    await asyncio.sleep(3.5)
    wtask.cancel(); await runner.cleanup()
    log.sort(key=lambda r: r["t"])
    return {"log": log, "final_status": state["status"],
            "times_work_done": sum(1 for r in log if r["what"] == "work done")}


async def delayed(c, url, log):
    await asyncio.sleep(0.02)                    # job.succeeded is sent just after job.running
    await deliver(c, url, "msg_job_succeeded", {"type": "job.succeeded", "data": {"id": "ftjob_01", "status": "succeeded"}}, log)


async def main():
    out["delivery"] = {"schedule_s": SCHEDULE, "scale": SCALE, "sender_timeout_s": TIMEOUT,
                       "naive": await run("naive"), "careful": await run("careful")}
    print(json.dumps(out, indent=1))

asyncio.run(main())
