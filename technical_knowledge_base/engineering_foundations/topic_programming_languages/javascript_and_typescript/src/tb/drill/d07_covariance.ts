const ids: number[] = [1, 2];
const mixed: (number | string)[] = ids;
mixed.push("three");
console.log(ids.map(n => n.toFixed(1)));
