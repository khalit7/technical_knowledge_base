// An uncaught error ends the process with exit code 1 and a stack trace, like a Python traceback.
function loadConfig(path) { return JSON.parse(`{"path": "${path}", "debug": tru}`); }
console.log("starting");
loadConfig("/etc/app.json");
