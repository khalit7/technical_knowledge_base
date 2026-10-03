// ---- The live ingredient's engine: the released EnvHarness classes ported to JS, over a toy household ----
// EnvHarness, Setup, Rules and Link follow envharness/core/envharness.py and envharness/harnesses/{setup,rules,link}.py
// of github.com/google-research/envharness (Apache-2.0) method for method: delegation by default, Setup replays its
// actions through inner.step() then calls notifyReplayComplete(), a blocked action leaves the world untouched and
// returns the re-observed state after f_O, Rules never touches the reward or the verdict, and Link runs A until it
// terminates, then B, with one shared step budget and success = A and B.
// The household (HouseEnv), its policy and its numbers are a toy built from the paper's running example
// ("put a clean mug on the desk", Section 2.2); they are illustrative, not ALFWorld.
var EH = (function () {
  const ORDER = ['countertop 1', 'sinkbasin 1', 'drawer 1', 'drawer 2', 'shelf 1', 'microwave 1', 'desk 1'];
  const CONTAINERS = { 'drawer 1': 1, 'drawer 2': 1, 'microwave 1': 1 };
  const BANNER = '-= Welcome to TextWorld, ALFRED! =-';
  const TASKS = {
    mug: { text: 'put a clean mug in desk 1.', obj: 'mug 1', need: 'clean', dest: 'desk 1' },
    potato: { text: 'heat a potato and put it on countertop 1.', obj: 'potato 1', need: 'hot', dest: 'countertop 1' }
  };
  let LOG = null; // when set, layers record what they did to the current step: LOG.push({layer, what})
  const note = (layer, what) => { if (LOG) LOG.push({ layer, what }) };
  const resp = (text, o) => Object.assign({ obs: text, reward: 0, terminated: false, truncated: false, info: {} }, o || {});

  // ---------- the Bridge: a frozen base environment (reset / step / observe / evaluate / getEnvState) ----------
  class HouseEnv {
    constructor(task, maxSteps) { this.taskKey = task || 'mug'; this.maxSteps = maxSteps || 50; this.kind = 'House (' + this.taskKey + ')' }
    reset() {
      const t = TASKS[this.taskKey];
      this.task = t;
      this.at = null; // the middle of the room
      this.items = { 'mug 1': { loc: 'countertop 1', clean: false, hot: false }, 'potato 1': { loc: 'shelf 1', clean: false, hot: false } };
      this.open = {}; this.holding = null; this.steps = 0; this.done = false; this.won = false; this.extras = {};
      note('env', 'reset');
      return { obs: this.observe() };
    }
    _contents(l) {
      const xs = Object.keys(this.items).filter(k => this.items[k].loc === l);
      return xs.length ? 'you see a ' + xs.join(', a ') : 'you see nothing';
    }
    _here() { const l = this.at; return CONTAINERS[l] && !this.open[l] ? 'The ' + l + ' is closed.' : 'On the ' + l + ', ' + this._contents(l) + '.' }
    _arrive(l) {
      if (CONTAINERS[l] && !this.open[l]) return 'You arrive at ' + l + '. The ' + l + ' is closed.';
      return 'You arrive at ' + l + '. On the ' + l + ', ' + this._contents(l) + '.';
    }
    observe() {
      let room;
      const look = 'Looking quickly around you, you see a ' + ORDER.join(', a ') + '.';
      if (this.steps === 0) room = BANNER + (this.at ? ' You are at ' + this.at + '. ' : ' You are in the middle of a room. ') + look + (this.at ? ' ' + this._here() : '');
      else room = this.at ? 'You are at ' + this.at + '.' : 'You are in the middle of a room.';
      return room + '\nYour task is to: ' + this.task.text;
    }
    step(a) {
      this.steps++;
      let m, out = 'Nothing happens.';
      const here = this.at, I = this.items;
      if ((m = a.match(/^go to (.+)$/)) && ORDER.includes(m[1])) { this.at = m[1]; out = this._arrive(m[1]) }
      else if (a === 'move right' || a === 'move left') {
        const i = here ? ORDER.indexOf(here) : -1, j = a === 'move right' ? i + 1 : (i < 0 ? -1 : i - 1);
        if (j < 0 || j >= ORDER.length) out = 'You cannot go further that way.'; else { this.at = ORDER[j]; out = this._arrive(ORDER[j]) }
      }
      else if ((m = a.match(/^open (.+)$/)) && m[1] === here && CONTAINERS[here]) { this.open[here] = 1; out = 'You open the ' + here + '. In it, ' + this._contents(here) + '.' }
      else if ((m = a.match(/^close (.+)$/)) && m[1] === here && CONTAINERS[here]) { this.open[here] = 0; out = 'You close the ' + here + '.' }
      else if ((m = a.match(/^take (.+) from (.+)$/)) && I[m[1]] && I[m[1]].loc === m[2] && m[2] === here && !this.holding && (!CONTAINERS[here] || this.open[here])) {
        I[m[1]].loc = 'hand'; this.holding = m[1]; out = 'You pick up the ' + m[1] + ' from the ' + here + '.'
      }
      else if ((m = a.match(/^put (.+) (?:in|on) (.+)$/)) && this.holding === m[1] && m[2] === here && (!CONTAINERS[here] || this.open[here])) {
        I[m[1]].loc = here; this.holding = null; out = 'You put the ' + m[1] + ' in/on the ' + here + '.'
      }
      else if ((m = a.match(/^clean (.+) with sinkbasin 1$/)) && this.holding === m[1] && here === 'sinkbasin 1') { I[m[1]].clean = true; out = 'You clean the ' + m[1] + ' using the sinkbasin 1.' }
      else if ((m = a.match(/^heat (.+) with microwave 1$/)) && this.holding === m[1] && here === 'microwave 1') { I[m[1]].hot = true; out = 'You heat the ' + m[1] + ' using the microwave 1.' }
      else if (a === 'look') out = here ? 'You are facing the ' + here + '.' : 'You are in the middle of a room.';
      else if (a === 'inventory') out = this.holding ? 'You are carrying: a ' + this.holding + '.' : 'You are not carrying anything.';
      this.won = this._goal();
      const terminated = this.won, truncated = !this.won && this.steps >= this.maxSteps;
      note('env', a + ' -> ' + out);
      return resp(out + '\nYour task is to: ' + this.task.text, { reward: this.won ? 1 : 0, terminated, truncated, info: { won: this.won } });
    }
    _goal() { const t = this.task, o = this.items[t.obj]; return o.loc === t.dest && (t.need === 'clean' ? o.clean : o.hot) }
    evaluate() { note('verifier', 'original verifier: ' + (this._goal() ? 'success' : 'fail')); return { success: this._goal(), metrics: { steps: this.steps } } }
    getEnvState() { return { at: this.at, holding: this.holding, items: this.items, open: this.open, steps: this.steps, extras: this.extras } }
    notifyReplayComplete() { this.steps = 0; this.extras = {} } // rewind per-episode counters after a Setup replay (like ALFWorld's)
  }

  // ---------- EnvHarness: a wrapper that IS an environment; every method delegates to inner by default ----------
  class EnvHarness {
    constructor(inner) { this.inner = inner }
    reset() { return this.inner.reset() }
    step(a) { return this.inner.step(a) }
    observe() { return this.inner.observe() }
    evaluate() { return this.inner.evaluate() }
    getEnvState() { return this.inner.getEnvState() }
    notifyReplayComplete() { this.inner.notifyReplayComplete() }
    get kind() { return this.constructor.name }
  }

  // Setup (the paper's Stage): replay a fixed action list through inner.step() on every reset.
  class Setup extends EnvHarness {
    constructor(inner, actions, label) { super(inner); this.actions = actions.slice(); this.label = label }
    reset() {
      this.inner.reset();
      this.replay = [];
      for (const a of this.actions) { const r = this.inner.step(a); this.replay.push({ a, obs: r.obs.split('\n')[0] }) }
      if (this.actions.length) this.inner.notifyReplayComplete();
      note('Stage', 'replayed ' + this.actions.length + ' actions');
      return { obs: this.inner.observe() };
    }
  }

  // Rules (the paper's Contract): f_A (filterAction), f_T (modifyTransition), f_O (filterObservation); defaults identity.
  class Rules extends EnvHarness {
    constructor(inner, hooks, label) { super(inner); this.h = hooks || {}; this.label = label }
    filterAction(a, s) { return this.h.fA ? this.h.fA(a, s) : a }
    modifyTransition(a, r, s) { return this.h.fT ? this.h.fT(a, r, s) : r }
    filterObservation(o, s) { return this.h.fO ? this.h.fO(o, s) : o }
    reset() {
      this.inner.reset();
      const s = this.inner.getEnvState(), fresh = this.inner.observe(), o = this.filterObservation(fresh, s);
      if (o !== fresh) note('Contract f_O', 'initial observation rewritten');
      return { obs: o };
    }
    step(a) {
      const s = this.inner.getEnvState(), f = this.filterAction(a, s);
      if (f && f.blocked) {
        // A blocked action leaves the env unchanged: re-observe and return the current state with the reason.
        note('Contract f_A', 'blocked: ' + f.blocked);
        const fresh = this.filterObservation(this.inner.observe(), s);
        return resp('[blocked] ' + f.blocked + '\n\n' + fresh, { info: { blocked: f.blocked } });
      }
      if (f !== a) note('Contract f_A', 'rewrote "' + a + '" to "' + f + '"');
      const raw = this.inner.step(f), post = this.inner.getEnvState();
      const tr = this.modifyTransition(f, raw, post);
      if (tr !== raw) note('Contract f_T', 'response rewritten');
      const o = this.filterObservation(tr.obs, post);
      if (o !== tr.obs) note('Contract f_O', 'observation rewritten');
      return Object.assign({}, tr, { obs: o }); // reward and termination pass through untouched
    }
    observe() { return this.filterObservation(this.inner.observe(), this.inner.getEnvState()) }
  }

  // Link (the paper's Chain): run A until it terminates, then hand off to B; one shared budget; success = A and B.
  class Link extends EnvHarness {
    constructor(a, b, budget) { super(a); this.a = a; this.b = b; this.budget = budget || 50 }
    reset() { this.stage = 'A'; this.used = 0; this.aOk = null; this.bReset = false; note('Chain', 'reset A only (B is reset lazily)'); return this.a.reset() }
    step(act) {
      this.used++;
      const cur = this.stage === 'A' ? this.a : this.b;
      let r = cur.step(act);
      if (this.stage === 'A' && (r.terminated || r.truncated)) {
        this.aOk = this.a.evaluate().success; // cached at the handoff
        if (r.terminated && this.used < this.budget) {
          this.stage = 'B'; const rb = this.b.reset(); this.bReset = true;
          note('Chain', 'A finished; handing off to B');
          return resp('[switched to new task] ' + r.obs.split('\n')[0] + '\n\n' + rb.obs, { info: { handoff: true } });
        }
      }
      const out = Object.assign({}, r);
      if (this.stage === 'A') out.terminated = false; // only the composite decides when the episode ends
      if (this.stage === 'A' && (r.terminated || r.truncated)) out.terminated = true;
      if (this.used >= this.budget && !out.terminated) { out.truncated = true; note('Chain', 'shared budget of ' + this.budget + ' steps used') }
      return out;
    }
    observe() { return (this.stage === 'A' ? this.a : this.b).observe() }
    evaluate() {
      const a = this.aOk === null ? this.a.evaluate().success : this.aOk;
      const b = this.bReset ? this.b.evaluate().success : false;
      note('verifier', 'composite verdict: A ' + (a ? 'pass' : 'fail') + ' and B ' + (b ? 'pass' : 'fail'));
      return { success: a && b, a, b };
    }
    getEnvState() { return (this.stage === 'A' ? this.a : this.b).getEnvState() }
  }

  // ---------- the components the page offers (all from the paper's examples) ----------
  const STAGES = {
    none: null,
    hide: { label: 'Stage: hide the mug in a closed drawer', actions: ['go to countertop 1', 'take mug 1 from countertop 1', 'go to drawer 1', 'open drawer 1', 'put mug 1 in drawer 1', 'close drawer 1', 'go to countertop 1'] },
    hidemw: { label: 'Stage: hide the mug in the closed microwave', actions: ['go to countertop 1', 'take mug 1 from countertop 1', 'go to microwave 1', 'open microwave 1', 'put mug 1 in microwave 1', 'close microwave 1', 'go to countertop 1'] },
    preclean: { label: 'Stage: clean the mug in advance', actions: ['go to countertop 1', 'take mug 1 from countertop 1', 'go to sinkbasin 1', 'clean mug 1 with sinkbasin 1', 'go to countertop 1', 'put mug 1 in countertop 1'] }
  };
  const HOOKS = {
    trunc: { label: 'f_O: keep only the first two sentences of the room description', fO: o => { const p = o.split('\n'); if (!p[0].startsWith(BANNER)) return o; const rest = p[0].slice(BANNER.length).trim().split(/(?<=\.)\s+/); p[0] = BANNER + ' ' + rest[0]; return p.join('\n') } },
    cleanhold: { label: 'f_T: cleaning fails with feedback unless you hold the object', fT: (a, r, s) => { const m = a.match(/^clean (.+) with/); if (m && s.holding !== m[1]) return Object.assign({}, r, { obs: 'You need to hold the ' + m[1] + ' first. Pick it up, then clean it.\n' + r.obs.split('\n').slice(1).join('\n') }); return r } },
    noteleport: { label: 'f_A: remove teleport navigation (go to)', fA: a => /^go to /.test(a) ? { blocked: 'Teleport navigation is disabled. Use move left / move right.' } : a }
  };
  // build(cfg) -> {env, layers}: cfg = {stage, hooks:[...], chain:bool, order:'release'|'swapped'}
  function build(cfg) {
    let env = new HouseEnv('mug'), layers = [{ name: 'House (base env)', kind: 'env' }];
    const st = STAGES[cfg.stage], hk = (cfg.hooks || []).map(k => HOOKS[k]);
    const hooks = {}; hk.forEach(h => Object.assign(hooks, h));
    const mkSetup = e => new Setup(e, st.actions, st.label), mkRules = e => new Rules(e, hooks, hk.map(h => h.label).join('; '));
    if (cfg.order === 'swapped') {
      if (hk.length) { env = mkRules(env); layers.push({ name: 'Contract', kind: 'rules' }) }
      if (st) { env = mkSetup(env); layers.push({ name: 'Stage', kind: 'setup' }) }
    } else {
      if (st) { env = mkSetup(env); layers.push({ name: 'Stage', kind: 'setup' }) }
      if (hk.length) { env = mkRules(env); layers.push({ name: 'Contract', kind: 'rules' }) }
    }
    if (cfg.chain) { env = new Link(env, new HouseEnv('potato'), 50); layers.push({ name: 'Chain', kind: 'link' }) }
    return { env, layers };
  }

  // ---------- the toy policy: a black box that reads only the observation text ----------
  // Habits (illustrative): it explores places in the order it first saw them named, opens a closed drawer only with
  // probability pOpen (the microwave with pOpenMw) on its first sweep, gives up after an unsuccessful first sweep with probability pGive, tries once
  // to clean an object it has only seen (not taken), and with probability slip per step does something aimless.
  // Without the room overview it walks (move right) until the corridor ends, learning places as it goes.
  function Policy(seed, o) {
    o = Object.assign({ pOpen: 0.4, pOpenMw: 0.15, pGive: 0.6, slip: 0, habit: true }, o || {});
    const rnd = mulberry32(seed * 7919 + 17);
    const fresh = walk => ({ places: [], over: false, seen: {}, swept: {}, sweeps: 0, walk: !!walk, at: null, x: null, pos: {}, end: false, endL: false, hold: null, done: {}, gaveUp: false, triedClean: false, task: null, opened: {}, dec: {}, last: '' });
    let M = fresh(false);
    function parse(obs) {
      let m;
      if (/^\[switched to new task\]/.test(obs)) { M = fresh(M.walk); obs = obs.split('\n\n').slice(1).join('\n\n') }
      const tl = obs.match(/Your task is to: (.+)\.$/m);
      if (tl) { const t = tl[1]; if ((m = t.match(/put a clean (\w+) in (.+)$/))) M.task = { obj: m[1] + ' 1', need: 'clean', dest: m[2] }; else if ((m = t.match(/heat a (\w+) and put it on (.+)$/))) M.task = { obj: m[1] + ' 1', need: 'hot', dest: m[2] } }
      const ls = obs.match(/Looking quickly around you, you see a ([^.]+)\./);
      if (ls) { M.over = true; ls[1].split(/, a /).forEach(p => { if (!M.places.includes(p)) M.places.push(p) }) }
      if (/\[blocked\] Teleport/.test(obs)) M.walk = true;
      if (/cannot go further/.test(obs)) { if (M.last === 'move right') M.end = true; else if (M.last === 'move left') M.endL = true }
      if ((m = obs.match(/You arrive at ([^.]+?)\./))) {
        if (/^move /.test(M.last)) { M.x = M.x == null ? 0 : M.x + (M.last === 'move right' ? 1 : -1) } else M.x = null;
        M.at = m[1]; if (M.x != null) M.pos[m[1]] = M.x;
        if (!M.places.includes(m[1])) M.places.push(m[1]);
      } else if ((m = obs.match(/You are at ([^.]+?)\./))) M.at = m[1];
      if ((m = obs.match(/(?:On the [^,]+, |In it, )you see (.+?)\.(?:\n|$)/m)) && M.at) M.seen[M.at] = m[1] === 'nothing' ? [] : m[1].replace(/^a /, '').split(/, a /);
      if (/ is closed\./.test(obs) && M.at && !(M.at in M.seen)) M.seen[M.at] = null;
      if ((m = obs.match(/You open the ([^.]+?)\./))) M.opened[m[1]] = 1;
      if ((m = obs.match(/You pick up the ([^.]+?) from/))) { M.hold = m[1]; Object.keys(M.seen).forEach(k => { if (M.seen[k]) M.seen[k] = M.seen[k].filter(x => x !== m[1]) }) }
      if ((m = obs.match(/You (?:clean|heat) the ([^.]+?) using/))) M.done[m[1]] = true;
      if (/You put the /.test(obs)) M.hold = null;
    }
    function nav(target) {
      if (!M.walk) return 'go to ' + target;
      if (M.x != null && M.pos[target] != null) return M.pos[target] > M.x ? 'move right' : 'move left';
      if (M.over && M.at && M.places.includes(target)) return M.places.indexOf(target) > M.places.indexOf(M.at) ? 'move right' : 'move left';
      if (M.over && !M.at) return 'move right';
      return M.end ? 'move left' : 'move right';
    }
    function decide() {
      const t = M.task; if (!t || M.gaveUp) return 'look';
      if (M.hold === t.obj) {
        if (!M.done[t.obj]) { const tool = t.need === 'clean' ? 'sinkbasin 1' : 'microwave 1'; if (M.at !== tool) return nav(tool); if (t.need === 'hot' && !M.opened[tool]) return 'open ' + tool; return (t.need === 'clean' ? 'clean ' : 'heat ') + t.obj + ' with ' + tool }
        if (M.at !== t.dest) return nav(t.dest);
        return 'put ' + t.obj + (t.dest.startsWith('countertop') ? ' on ' : ' in ') + t.dest;
      }
      const where = Object.keys(M.seen).find(k => M.seen[k] && M.seen[k].includes(t.obj));
      if (where) {
        if (o.habit && t.need === 'clean' && !M.triedClean) { M.triedClean = true; return 'clean ' + t.obj + ' with sinkbasin 1' }
        if (M.at !== where) return nav(where);
        if (CONTAINERS[where] && !M.opened[where]) return 'open ' + where;
        return 'take ' + t.obj + ' from ' + where;
      }
      // search: look inside a closed container here (sometimes), then move on to the next place not yet swept
      if (M.at && !M.swept[M.at] && M.seen[M.at] === null && !M.opened[M.at]) {
        if (!(M.at in M.dec)) M.dec[M.at] = M.sweeps > 0 || rnd() < (/microwave/.test(M.at) ? o.pOpenMw : o.pOpen);
        if (M.dec[M.at]) return 'open ' + M.at;
      }
      if (M.at) M.swept[M.at] = true;
      if (!M.over && !M.end) return 'move right'; // no overview: walk to one end of the corridor, then the other
      if (!M.over && !M.endL) return 'move left';
      let nx = M.places.find(p => !M.swept[p]);
      if (!nx) {
        if (M.sweeps === 0 && rnd() < o.pGive) { M.gaveUp = true; return 'look' }
        if (M.sweeps >= 2) { M.gaveUp = true; return 'look' }
        M.sweeps++; M.swept = {}; M.dec = {};
        nx = M.places.find(p => p !== M.at && !M.swept[p]);
        if (M.at && M.seen[M.at] === null && !M.opened[M.at]) return 'open ' + M.at;
      }
      return nav(nx);
    }
    function act(obs) {
      parse(obs);
      let a;
      if (o.slip && rnd() < o.slip) { const r = rnd(); a = r < .4 ? 'look' : r < .7 ? 'inventory' : M.places.length ? 'go to ' + M.places[Math.floor(rnd() * M.places.length)] : 'move right' }
      else a = decide();
      M.last = a; return a;
    }
    return { act, mem: () => M };
  }

  // run one episode; returns the trace (one entry per step) and the verdict
  function run(cfg, seed, popt, maxSteps) {
    const { env, layers } = build(cfg), pol = Policy(seed, popt);
    LOG = []; const r0 = env.reset(); const reset = { log: LOG, obs: r0.obs, replay: findReplay(env), st: snap(env) };
    const steps = []; let obs = r0.obs, end = false, n = 0; maxSteps = maxSteps || 50;
    while (!end && n < maxSteps) {
      const a = pol.act(obs); LOG = [];
      const r = env.step(a); n++;
      steps.push({ a, obs: r.obs, log: LOG, st: snap(env), term: r.terminated, trunc: r.truncated });
      obs = r.obs; end = r.terminated || r.truncated;
    }
    LOG = []; const v = env.evaluate(); const vlog = LOG; LOG = null;
    return { layers, reset, steps, verdict: v, vlog, startSnap: null };
  }
  function findReplay(e) { while (e) { if (e instanceof Setup) return e.replay; e = e.inner } return null }
  function base(e) { while (e && e.inner) e = e instanceof Link ? (e.stage === 'A' ? e.a : e.b) : e.inner; return e }
  function snap(env) { const b = base(env); return { at: b.at, holding: b.holding, mug: b.items['mug 1'].loc, mugClean: b.items['mug 1'].clean, potato: b.items['potato 1'].loc, potatoHot: b.items['potato 1'].hot, open: Object.assign({}, b.open), task: b.taskKey } }
  function rollouts(cfg, K, popt, seed0) { const out = []; for (let i = 0; i < K; i++) { const r = run(cfg, seed0 + i, popt); out.push({ ok: r.verdict.success, steps: r.steps.length, timeout: !r.verdict.success && r.steps.length >= 50 }) } return out }
  return { ORDER, CONTAINERS, STAGES, HOOKS, build, run, rollouts, Policy, HouseEnv, Setup, Rules, Link, snapOf: e => snap(e) };
})();
