function add(item, acc = []) {   // evaluated on every call
  acc.push(item);
  return acc;
}
console.log(add(1), add(2));
