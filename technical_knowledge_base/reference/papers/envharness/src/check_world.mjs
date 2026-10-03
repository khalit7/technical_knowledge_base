// Checks of the live ingredient's engine (parts/14_js_world.js) against the released classes' contracts, plus the
// success rates the page quotes. usage (from src/): node check_world.mjs
import fs from 'node:fs';
const code = 'function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}\n' + fs.readFileSync(new URL('./parts/14_js_world.js', import.meta.url), 'utf8') + '\nglobalThis.EH=EH;';
(0, eval)(code);
const EH = globalThis.EH; let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++ };
// 1. a blocked action leaves the world untouched and returns the current (filtered) observation with the reason (rules.py)
{ const { env } = EH.build({ stage: 'none', hooks: ['noteleport'] }); env.reset(); const before = JSON.stringify(env.getEnvState()); const r = env.step('go to desk 1');
  ok(JSON.stringify(env.getEnvState()) === before && /^\[blocked\] /.test(r.obs) && /Your task is to/.test(r.obs) && r.reward === 0 && !r.terminated, 'blocked action: world unchanged, reason plus current observation, no reward, not terminated') }
// 2. Setup replays through inner.step, then notifyReplayComplete rewinds the step counter (setup.py)
{ const { env } = EH.build({ stage: 'hide', hooks: [] }); env.reset(); const s = env.getEnvState();
  ok(s.steps === 0 && s.items['mug 1'].loc === 'drawer 1' && !s.open['drawer 1'], 'Stage: mug in the closed drawer, step counter rewound to 0') }
// 3. order: Rules outside Setup (release) lets the replay through; Setup outside Rules sends the replay through the Contract
{ const a = EH.build({ stage: 'hide', hooks: ['noteleport'] }).env; a.reset(); const b = EH.build({ stage: 'hide', hooks: ['noteleport'], order: 'swapped' }).env; b.reset();
  ok(a.getEnvState().items['mug 1'].loc === 'drawer 1' && b.getEnvState().items['mug 1'].loc === 'countertop 1', 'order: released order hides the mug; swapped order leaves it on the countertop') }
// 4. Rules never changes the verdict: evaluate() passes through to the base env
{ const { env } = EH.build({ stage: 'none', hooks: ['trunc', 'cleanhold', 'noteleport'] }); env.reset(); ok(env.evaluate().success === false, 'Contract: evaluate() is the base verifier') }
// 5. Link: success = A and B; B reset lazily at the handoff; budget shared
{ const r = EH.run({ stage: 'none', hooks: [], chain: true }, 1, {}); ok(r.verdict.success && r.verdict.a && r.verdict.b && r.steps.some(s => /^\[switched to new task\]/.test(s.obs)), 'Chain: handoff happens and both verdicts pass');
  const r2 = EH.run({ stage: 'hide', hooks: [], chain: true }, 4, {}); ok(!r2.verdict.success && r2.steps.length <= 50, 'Chain: a failed first task fails the chain within the 50-step budget') }
// 6. the success rates the page quotes (400 rollouts, slip 0)
const sr = c => { const R = EH.rollouts(c, 400, {}, 1000); return R.filter(x => x.ok).length / 400 };
const q = [['static', { stage: 'none', hooks: [] }, 1.0], ['hide in drawer', { stage: 'hide', hooks: [] }, 0.635], ['hide in microwave', { stage: 'hidemw', hooks: [] }, 0.505], ['hide + no teleport, swapped', { stage: 'hide', hooks: ['noteleport'], order: 'swapped' }, 1.0]];
for (const [n, c, v] of q) { const s = sr(c); ok(Math.abs(s - v) < 0.001, n + ': success rate ' + s.toFixed(3)) }
const d = EH.run({ stage: 'hide', hooks: ['noteleport'] }, 3, {}); ok(d.verdict.success && d.steps.length === 24, 'default episode (hide + no teleport, seed 3): success in ' + d.steps.length + ' steps');
const b = EH.run({ stage: 'none', hooks: [] }, 3, {}); ok(b.verdict.success && b.steps.length === 7, 'static episode: success in ' + b.steps.length + ' steps');
console.log(bad ? bad + ' FAILED' : 'all engine checks pass'); process.exit(bad ? 1 : 0);
