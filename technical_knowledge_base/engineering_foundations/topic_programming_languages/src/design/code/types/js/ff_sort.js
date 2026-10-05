console.log([10, 9, 1, 100].sort());                 // compares as strings by default
console.log([10, 9, 1, 100].sort((a, b) => a - b));  // pass a comparator for numbers
