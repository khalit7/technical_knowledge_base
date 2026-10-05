// run: always
function find(key: string): string | undefined {
  return key === "a" ? "Ada" : undefined;
}
const name = find("b");
console.log(name?.toUpperCase() ?? "nobody");
console.log(name.toUpperCase());   // strictNullChecks: possibly undefined
