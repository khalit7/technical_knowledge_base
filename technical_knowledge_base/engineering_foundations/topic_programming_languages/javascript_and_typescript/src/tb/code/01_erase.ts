// run: always
function countTokens(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
console.log(countTokens("the cat sat"));
console.log(countTokens(42 as any));
