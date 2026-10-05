function repeatName(name: string | undefined): string[] {
  /*@name|A parameter that may be undefined.*/
  if (!name) { /*@name|Falsy: undefined, or the empty string "".*/ return []; }
  /*@name|After the early return: string.*/
  const out = [1, 2].map(i => { /*@name|Inside a callback that runs later: still string, because name is never assigned again.*/ return name.repeat(i); });
  return out;
}
console.log(repeatName("ab"), repeatName(undefined));
