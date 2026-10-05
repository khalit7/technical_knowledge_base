function repeatName(name: string | undefined): string[] {
  /*@name|A parameter that may be undefined.*/
  if (!name) { /*@name|Falsy: undefined, or the empty string "".*/ return []; }
  /*@name|After the early return: string.*/
  const out = [1, 2].map(i => { /*@name|The same callback, but name is assigned again below: tsc cannot trust the narrowing inside it.*/ return name.repeat(i); });
  name = undefined;
  return out;
}
console.log(repeatName("ab"), repeatName(undefined));
