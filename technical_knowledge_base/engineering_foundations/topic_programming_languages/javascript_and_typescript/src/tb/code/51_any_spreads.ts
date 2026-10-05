// run: always
const config = JSON.parse('{"retries": "3"}');   // JSON.parse returns any
const retries = config.retries;                   // any
const delays = [1, 2, 3].map(i => i * retries);   // number[], says the checker
const total: number = retries + 1;                // accepted
console.log(delays, total, typeof total);
