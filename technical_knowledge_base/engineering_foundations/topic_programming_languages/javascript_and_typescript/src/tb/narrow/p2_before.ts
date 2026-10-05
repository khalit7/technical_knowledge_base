type Event = {
  type: "text" | "tool_call" | "done";
  delta?: string; name?: string; stopReason?: "end" | "max_tokens";
};
function render(e: Event): string {
  /*@e|One "bag" type with optional fields: the same data, no union.*/
  switch (e.type) {
    case "text": /*@e.delta|The tag is checked, but delta stays optional: string | undefined.*/ return e.delta;
    case "tool_call": /*@e.name|name is still possibly undefined; a template string accepts it and would print "undefined".*/ return `[${e.name}]`;
    case "done": /*@e.stopReason|Same for stopReason: no error, but no guarantee either.*/ return ` <${e.stopReason}>`;
    default: { /*@e|tsc cannot prove the switch is complete: e is still Event.*/ const gone: never = e; return gone; }
  }
}
console.log(render({ type: "text", delta: "hi" }), render({ type: "done", stopReason: "end" }));
