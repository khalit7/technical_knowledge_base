// Task: one generic topK used for two different element types.
function topK<T>(items: readonly T[], k: number, key: (x: T) => number): T[] {
  return [...items].sort((a, b) => key(b) - key(a)).slice(0, k);
}

const counts: Array<[string, number]> = [["u0005", 4816], ["u0029", 9491], ["u0042", 3499]];
console.log(topK(counts, 2, (kv) => kv[1]));
const words = ["kernel", "a", "attention", "GPU"];
console.log(topK(words, 2, (w) => w.length));
console.log(topK([0.5, NaN, 2.0], 2, (x) => x)); // number includes NaN; the comparator breaks quietly
