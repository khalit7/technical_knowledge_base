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
console.log(countTokens("x86_64 café"));
console.log(countTokens(42));    // wrong type: a user id instead of the message text
