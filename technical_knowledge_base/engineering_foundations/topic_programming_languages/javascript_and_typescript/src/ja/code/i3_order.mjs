// The classic ordering question. Predict the order of the seven lines before you look.
console.log("sync start");
setTimeout(() => console.log("setTimeout 0"), 0);
Promise.resolve().then(() => console.log("promise.then"));
queueMicrotask(() => console.log("queueMicrotask"));
(async () => {
  console.log("async body, before await");
  await null;
  console.log("async body, after await");
})();
console.log("sync end");
