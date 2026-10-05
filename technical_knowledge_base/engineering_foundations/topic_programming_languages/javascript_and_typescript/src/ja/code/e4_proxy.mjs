// Proxy: intercept property reads and writes on an object (Python's __getattr__ and __setattr__, for any object).
// Libraries use it for reactivity, mocks and lazy clients; it is slower than plain objects.
const config = new Proxy({ model: "small" }, {
  get(target, key) { if (!(key in target)) throw new Error(`unknown setting: ${String(key)}`); return target[key]; },
  set(target, key, value) { if (key === "temperature" && (value < 0 || value > 2)) throw new RangeError("temperature must be in [0, 2]"); target[key] = value; return true; },
});
config.temperature = 0.7;
console.log(config.model, config.temperature);
try { config.temprature; } catch (e) { console.log(e.message); }      // a typo is now an error, not undefined
try { config.temperature = 5; } catch (e) { console.log(e.name, e.message); }
