console.log(parseInt("4x2"), Number("4x2"));   // no exception: 4 and NaN
try { JSON.parse("{bad"); } catch (e) { console.log(e.name, "|", e.message); }
try { throw "just a string"; } catch (e) { console.log(typeof e); } // anything can be thrown
