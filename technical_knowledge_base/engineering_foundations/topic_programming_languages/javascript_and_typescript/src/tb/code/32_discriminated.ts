type Event =
  | { type: "text"; delta: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "done"; stopReason: "end" | "max_tokens" };

function render(e: Event): string {
  switch (e.type) {
    case "text": return e.delta;                       // e: the text member only
    case "tool_call": return `[${e.name}(${JSON.stringify(e.args)})]`;
    case "done": return ` <${e.stopReason}>`;
    default: { const unreachable: never = e; return unreachable; }
  }
}
const stream: Event[] = [
  { type: "text", delta: "Paris" },
  { type: "tool_call", name: "weather", args: { city: "Paris" } },
  { type: "done", stopReason: "end" },
];
console.log(stream.map(render).join(""));
