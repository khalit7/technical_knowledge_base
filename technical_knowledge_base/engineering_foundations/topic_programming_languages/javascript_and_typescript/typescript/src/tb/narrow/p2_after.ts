type Event =
  | { type: "text"; delta: string }
  | { type: "tool_call"; name: string }
  | { type: "done"; stopReason: "end" | "max_tokens" };
function render(e: Event): string {
  /*@e|A union of three object types that share a literal "type" field.*/
  switch (e.type) {
    case "text": /*@e|Checking the literal tag picks one member: e.delta is a string.*/ return e.delta;
    case "tool_call": /*@e|Only the tool_call member here.*/ return `[${e.name}]`;
    case "done": /*@e|Only the done member here.*/ return ` <${e.stopReason}>`;
    default: { /*@e|Every member handled: nothing is left, so e is never.*/ const gone: never = e; return gone; }
  }
}
console.log(render({ type: "text", delta: "hi" }), render({ type: "done", stopReason: "end" }));
