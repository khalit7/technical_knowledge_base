// run: no
type Event =
  | { type: "text"; delta: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "done"; stopReason: "end" | "max_tokens" }
  | { type: "error"; message: string };          // a new member was added

function render(e: Event): string {
  switch (e.type) {
    case "text": return e.delta;
    case "tool_call": return `[${e.name}]`;
    case "done": return ` <${e.stopReason}>`;
    default: { const unreachable: never = e; return unreachable; }
  }
}
