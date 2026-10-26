// Cancelling: an AbortController's signal is passed to the work; aborting rejects with an AbortError.
// Timeouts are the same mechanism: AbortSignal.timeout(ms). (Python: asyncio.timeout / task.cancel().)
import { setTimeout as sleep } from "node:timers/promises";
const ac = new AbortController();
setTimeout(() => ac.abort(), 50);
try { await sleep(1000, "done", { signal: ac.signal }); }
catch (e) { console.log(e.name, "|", ac.signal.aborted, ac.signal.reason.name); }
try { await sleep(1000, "done", { signal: AbortSignal.timeout(30) }); }
catch (e) { console.log(e.name, "|", e.cause?.name ?? "", e.message); }
// Work that ignores the signal is NOT stopped: aborting is a request, not preemption.
async function stubborn(signal) { await sleep(80); return signal.aborted ? "finished anyway, after the abort" : "finished"; }
const ac2 = new AbortController(); const p = stubborn(ac2.signal); ac2.abort();
console.log(await p);
