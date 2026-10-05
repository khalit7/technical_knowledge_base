type Reply = { kind: "ok"; text: string } | { kind: "refused"; reason: string } | { kind: "error"; status: number } | null;
function summarize(r: Reply): string {
  /*@r|Three object kinds plus null.*/
  if (!r) { /*@r|Falsy: only null can be falsy here (objects are always truthy).*/ return "no reply"; }
  /*@r|null is gone.*/
  if ("text" in r) { /*@r|The in operator keeps the members that have a text property.*/ return r.text; }
  /*@r|ok is gone.*/
  if (r.kind === "refused") { /*@r|An equality check on the tag.*/ return `refused: ${r.reason}`; }
  /*@r|Only the error member is left.*/
  return `error ${r.status}`;
}
console.log(summarize(null), summarize({ kind: "ok", text: "hi" }), summarize({ kind: "error", status: 529 }));
