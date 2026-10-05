async function job() {
  console.log("job start");
  await null;
  console.log("job resumed");
}
console.log("main start");
setTimeout(() => console.log("timer"), 0);
job();
Promise.resolve().then(() => console.log("then"));
console.log("main end");
