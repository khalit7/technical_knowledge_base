const top: string[] = ["u0029", "u0005"];
const saved = top;       // a second reference to the SAME array
saved.push("u0042");
console.log("top:", top);
