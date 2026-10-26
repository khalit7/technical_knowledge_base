function isText(v: unknown): v is string { return typeof v === "string"; }
function show(x: string | number | string[] | null | undefined) {
  /*@x|The declared type: five possibilities.*/
  if (x == null) { /*@x|Inside: == null matches both null and undefined.*/ return "-"; }
  /*@x|After the early return, null and undefined are gone.*/
  if (isText(x)) { /*@x|The predicate "v is string" narrows x to string.*/ return x.toUpperCase(); }
  /*@x|Outside the if, string is removed too.*/
  if (Array.isArray(x)) { /*@x|Array.isArray is itself a type predicate.*/ return x.join("+"); }
  /*@x|Only number is left, so toFixed is allowed.*/
  return x.toFixed(1);
}
console.log(show(null), show("hi"), show(["a", "b"]), show(2));
