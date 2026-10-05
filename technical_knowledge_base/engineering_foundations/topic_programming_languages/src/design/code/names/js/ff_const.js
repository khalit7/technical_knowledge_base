const limits = [100];
limits.push(200);              // allowed: const fixes the binding, not the array
console.log(limits);
limits = [];                   // rebinding is what const forbids
