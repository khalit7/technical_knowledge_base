const first = (xs: readonly number[]) => xs[0] ?? 0;
const nums = [3, 1, 2];
nums.sort();
console.log(first(nums), nums);
