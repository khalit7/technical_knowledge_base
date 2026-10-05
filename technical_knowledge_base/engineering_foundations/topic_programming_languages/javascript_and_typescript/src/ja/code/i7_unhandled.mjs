// A rejected promise nobody handles: since Node 15 the process crashes (exit code 1), like an uncaught exception.
async function sendTelemetry() { throw new Error("telemetry server down"); }
sendTelemetry();                                  // fire and forget: no await, no .catch
setTimeout(() => console.log("this never prints"), 100);
console.log("main code finished");
