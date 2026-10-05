// run: no
type Event = {                       // the same data as one "bag" of optional fields
  type: "text" | "tool_call" | "done";
  delta?: string; name?: string; stopReason?: "end" | "max_tokens";
};
function render(e: Event): string {
  switch (e.type) {
    case "text": return e.delta;     // still string | undefined
    case "tool_call": return e.name;
    case "done": return e.stopReason;
  }
}
