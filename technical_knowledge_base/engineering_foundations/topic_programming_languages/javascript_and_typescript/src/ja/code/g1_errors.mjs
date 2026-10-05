// throw, try/catch/finally, Error subclasses and error chaining with { cause } (Python's raise ... from ...).
class ParseError extends Error {
  constructor(line, options) { super(`bad JSON on line ${line}`, options); this.name = "ParseError"; this.line = line; }
}
function parseLine(s, n) {
  try { return JSON.parse(s); }
  catch (e) { throw new ParseError(n, { cause: e }); }      // keep the original error as the cause
}
try { parseLine("{oops", 53); }
catch (e) {
  console.log(e instanceof ParseError, e instanceof Error, e.name, e.line);
  console.log(e.message, "| cause:", e.cause.name, "-", e.cause.message);
} finally { console.log("finally always runs"); }
try { throw "a bare string"; } catch (e) { console.log(typeof e, e?.stack); }   // anything can be thrown; only Errors carry a stack
try { null.x; } catch (e) { console.log(e.name); }            // no except TypeError: one catch, then test the type
