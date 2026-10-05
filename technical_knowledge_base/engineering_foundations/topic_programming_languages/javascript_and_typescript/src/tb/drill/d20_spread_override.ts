interface Cfg { temperature: number }
const defaults: Cfg = { temperature: 0.7 };
const user: Partial<Cfg> = { temperature: undefined };
const cfg: Cfg = { ...defaults, ...user };
console.log(cfg.temperature.toFixed(1));
