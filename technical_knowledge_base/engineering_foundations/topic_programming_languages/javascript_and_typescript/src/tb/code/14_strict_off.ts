// cfg: {"strict": false, "noUncheckedIndexedAccess": false, "exactOptionalPropertyTypes": false}
// run: always
function shout(s) { return s.toUpperCase(); }
const names: string[] = ["ana"];
const found: string = names.find(n => n === "bob");
console.log(shout("hi"), found.length);
