const data: any = JSON.parse('{"count": "3"}');
const n: number = data.count;        // any switches checking off: no error
console.log(n + 1);
const m = JSON.parse('{"count": "3"}') as { count: number };
console.log(m.count + 1);            // as is a claim, not a check
