// One number type: a 64-bit IEEE 754 double, exactly like a Python float.
console.log(0.1 + 0.2);                       // same as Python
console.log(7 / 2, -7 / 2);                   // no integer division: / always gives a double
console.log(Math.trunc(-7 / 2), Math.floor(-7 / 2), -7 % 2);   // Python's -7 // 2 is -4, -7 % 2 is 1
console.log(Number.MAX_SAFE_INTEGER);         // 2**53 - 1: the last integer every double can hold
console.log(2 ** 53 + 1);                     // rounded: the + 1 is lost
console.log(JSON.parse('{"id": 1234567890123456789}').id);   // a 64-bit id from an API, silently changed
console.log(1 / 0, -1 / 0, 0 / 0);            // no ZeroDivisionError: Infinity and NaN
console.log(NaN === NaN, Number.isNaN(0 / 0));
console.log(parseInt("42px"), Number("42px"), parseInt("08"), (255).toString(16));
