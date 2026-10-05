// old.cjs: CommonJS uses require() and module.exports; require is synchronous
const { shout } = require("./legacy.cjs");
const tokens = require("./tokens.js");               // require() of an ES module: allowed since Node 22.12 and 20.19
console.log(shout("cjs"), tokens.countTokens("a b c"), typeof tokens.default);
console.log(typeof module, __filename.split("/").pop());
