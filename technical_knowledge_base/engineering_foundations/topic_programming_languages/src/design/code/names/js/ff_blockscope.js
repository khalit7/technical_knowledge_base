let x = 1;
if (true) {
  let x = 2;                 // block scope: a different x
}
for (let i = 0; i < 3; i++) {}
console.log(x);
console.log(i);              // i does not exist out here
