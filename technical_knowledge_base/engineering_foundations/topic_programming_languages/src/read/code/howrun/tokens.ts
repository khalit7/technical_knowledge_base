function countTokens(text: string): number {
  let n = 0;
  let inside = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    const tok = (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57);
    if (tok && !inside) n++;
    inside = tok;
  }
  return n;
}
const sample: string = "attention training trained for; x86_64 café v2.1 C++ ".repeat(50);
let total: number = 0;
for (let k = 0; k < 20000; k++) total += countTokens(sample);
console.log(total);
