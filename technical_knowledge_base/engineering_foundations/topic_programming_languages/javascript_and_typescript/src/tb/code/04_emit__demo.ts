interface Msg { role: "user" | "assistant"; text: string }
function total(msgs: Msg[]): number {
  let n: number = 0;
  for (const m of msgs) n += m.text.length;
  return n;
}
const msgs: Msg[] = [{ role: "user", text: "hi" }];
console.log(total(msgs) as number);
