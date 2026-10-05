// run: always
interface Speaker { speak(): string }
class Dog { speak() { return "woof"; } }       // never says "implements Speaker"
const robot = { speak: () => "beep" };
function talk(x: Speaker) { console.log(x.speak()); }
talk(new Dog()); talk(robot);
talk({ speak: () => 42 });                     // wrong shape: rejected by the checker
