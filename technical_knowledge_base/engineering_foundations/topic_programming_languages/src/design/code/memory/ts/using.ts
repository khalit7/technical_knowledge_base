// cmd: tsc --target es2022 --lib esnext --types node --module nodenext --outDir js using.ts && node js/using.js
class File {
  constructor(public name: string) { console.log("open", name); }
  [Symbol.dispose]() { console.log("close", this.name); }
}
{
  using f = new File("a.txt");   // disposed when the block ends, like with in Python
  console.log("working");
}
console.log("after block");
