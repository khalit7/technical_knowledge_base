// run: always
function parse(s: string): number {   // the signature cannot say "may throw"
  return JSON.parse(s);
}
try { parse("{bad"); }
catch (e) { console.log(e.message); }  // strict: e is unknown, so this is rejected
