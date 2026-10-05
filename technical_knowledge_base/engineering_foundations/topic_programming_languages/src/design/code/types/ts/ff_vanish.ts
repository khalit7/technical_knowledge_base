function nextId(x: number): number {
  return x + 1;
}
const fromApi = JSON.parse('{"id": "41"}');   // any: the checker trusts it
console.log(nextId(fromApi.id));               // no check at run time: "41" + 1
