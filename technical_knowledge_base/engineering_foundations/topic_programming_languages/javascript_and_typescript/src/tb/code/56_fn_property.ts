// run: no
interface Handler { handle: (e: string | number) => void }  // property syntax: checked
const h: Handler = { handle(e: string) { console.log(e.toUpperCase()); } };
