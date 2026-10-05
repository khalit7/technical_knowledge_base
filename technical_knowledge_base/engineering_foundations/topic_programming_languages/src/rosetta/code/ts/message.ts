// Task: a Message type; what happens when you copy it and change the copy.
class Message {
  constructor(public user: string, public text: string) {}
  tokens(): number {
    return (this.text.match(/[A-Za-z0-9]+/g) ?? []).length;
  }
}

const a = new Message("u0029", "hello world");
const b = a;                 // a second name for the SAME object (like Python)
b.text = "changed";
console.log(a.text, a === b);

const c = Object.assign(new Message("", ""), a, { text: "copy" }); // a shallow copy
console.log(a.text, c.text, a === c);
console.log(c, c.tokens());
