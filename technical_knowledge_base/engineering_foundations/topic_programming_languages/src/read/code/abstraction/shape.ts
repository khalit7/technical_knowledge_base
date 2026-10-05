interface HasTokens { tokens(): number }          // structural, like a Protocol
const message = (text: string) => ({ tokens: () => text.split(" ").length });
const batch = (items: HasTokens[]) => ({ tokens: () => items.reduce((s, m) => s + m.tokens(), 0) });
function total(items: HasTokens[]): number { return items.reduce((s, x) => s + x.tokens(), 0); }
console.log(total([message("hello there"), batch([message("a b c"), message("d")])]));
