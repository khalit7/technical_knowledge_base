// Default parameters and arguments
function f(x = 1, y = x * 2) { return [x, y]; }
console.log(f(), f(5), f(undefined, 3), f(null));
