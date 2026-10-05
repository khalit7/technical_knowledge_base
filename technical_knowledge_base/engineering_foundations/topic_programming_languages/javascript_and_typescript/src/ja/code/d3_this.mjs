// `this` is decided by HOW a function is called, not where it is written.
const bot = {
  name: "bot",
  hello() { return `hi from ${this?.name}`; },
  later() { return [1].map(function () { return this?.name; }); },   // a plain callback: this is lost
  laterArrow() { return [1].map(() => this.name); },                 // an arrow keeps the outer this
};
console.log(bot.hello());                       // called as bot.hello(): this = bot
const loose = bot.hello;
console.log(loose());                           // called bare: this = undefined (modules are strict)
console.log(bot.later(), bot.laterArrow());
const bound = bot.hello.bind(bot);              // Python's bound method, made by hand
console.log(bound(), bot.hello.call({ name: "other" }));
