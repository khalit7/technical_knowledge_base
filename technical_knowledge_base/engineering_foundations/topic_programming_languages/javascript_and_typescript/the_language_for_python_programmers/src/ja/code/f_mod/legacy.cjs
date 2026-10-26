// legacy.cjs: a CommonJS module (.cjs forces CommonJS whatever package.json says)
function shout(s) { return s.toUpperCase(); }
module.exports = { shout };
