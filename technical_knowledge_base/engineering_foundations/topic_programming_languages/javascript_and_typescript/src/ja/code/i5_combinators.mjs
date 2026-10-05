// Waiting for several promises: all (fail fast), allSettled (never rejects), race (first to settle), any (first success).
const ok = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));
const bad = (ms, m) => new Promise((_, j) => setTimeout(() => j(new Error(m)), ms));
let t0 = 0; const start = () => { t0 = performance.now(); }, took = () => `after ${Math.round(performance.now() - t0)} ms`;
start(); console.log("all:", await Promise.all([ok(30, "a"), ok(10, "b")]), took());   // results in INPUT order
start(); try { await Promise.all([ok(50, "a"), bad(10, "b failed")]); } catch (e) { console.log("all:", e.message, took()); }
const settled = await Promise.allSettled([ok(10, "a"), bad(10, "b failed")]);
console.log("allSettled:", settled.map(s => s.status === "fulfilled" ? `ok ${s.value}` : `error ${s.reason.message}`));
console.log("race:", await Promise.race([ok(30, "slow"), ok(10, "fast")]));
try { await Promise.any([bad(5, "x"), bad(5, "y")]); } catch (e) { console.log("any:", e.constructor.name, e.errors.map(x => x.message)); }
