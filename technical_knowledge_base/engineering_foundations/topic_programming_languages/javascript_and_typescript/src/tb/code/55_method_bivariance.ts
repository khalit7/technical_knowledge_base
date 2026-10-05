// run: always
interface Handler { handle(e: string | number): void }   // method syntax: bivariant
const h: Handler = { handle(e: string) { console.log(e.toUpperCase()); } };
h.handle("ok");
h.handle(42);
