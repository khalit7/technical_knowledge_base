const a = [], b = [];
for (let i = 0; i < 3; i++) a.push(() => i);   // let: a fresh i per iteration
for (var j = 0; j < 3; j++) b.push(() => j);   // var: one j for the whole loop
console.log(a.map(f => f()), b.map(f => f()));
