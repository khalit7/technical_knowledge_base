// run: always
async function countTokens(text: string): Promise<number> {
  return text.split(" ").length;
}
const n = countTokens("one two three");   // forgot await: n is a Promise
console.log(n + 1);
