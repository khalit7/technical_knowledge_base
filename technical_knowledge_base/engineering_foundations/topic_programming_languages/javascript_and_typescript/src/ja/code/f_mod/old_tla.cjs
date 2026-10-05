// require() cannot load an ES module that uses top-level await: require must finish synchronously
try { require("./tla.js"); } catch (e) { console.log(e.code + ": " + e.message.split("\n")[0]); }
