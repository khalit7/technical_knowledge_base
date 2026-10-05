const user = new Proxy({}, {                 // intercept property access at run time
  get: (obj, key) => (key in obj ? obj[key] : `<no ${String(key)}>`),
});
user.name = "Ada";
console.log(user.name, user.email);
