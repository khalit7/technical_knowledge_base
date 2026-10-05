// cmd: tsc --target es5 --noEmit removed.ts
// TypeScript 7 removed the ES5 compile target
const greet = (name: string) => `hi ${name}`;
console.log(greet("Ada"));
