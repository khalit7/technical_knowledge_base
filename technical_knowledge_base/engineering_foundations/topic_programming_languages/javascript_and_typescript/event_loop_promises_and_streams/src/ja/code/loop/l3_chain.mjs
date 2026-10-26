setTimeout(() => {
  console.log("timer 1");
  Promise.resolve().then(() => console.log("micro from timer 1"));
}, 0);
setTimeout(() => console.log("timer 2"), 0);
Promise.resolve()
  .then(() => console.log("then 1"))
  .then(() => console.log("then 2"));
console.log("sync");
