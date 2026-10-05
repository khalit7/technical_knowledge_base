function isText(v: unknown): boolean { return typeof v === "string"; }
function show(x: string | number | string[] | null | undefined) {
  /*@x|The declared type: five possibilities.*/
  if (x == null) { /*@x|Inside: == null matches both null and undefined.*/ return "-"; }
  /*@x|After the early return, null and undefined are gone.*/
  if (isText(x)) { /*@x|isText returns a plain boolean: tsc learns nothing, x is not narrowed.*/ return x.toUpperCase(); }
  /*@x|string is still here, so the next lines fail.*/
  if (Array.isArray(x)) { /*@x|Array.isArray still narrows: to string[] only.*/ return x.join("+"); }
  /*@x|number or string remain: toFixed is an error.*/
  return x.toFixed(1);
}
console.log(show(null), show("hi"), show(["a", "b"]), show(2));
