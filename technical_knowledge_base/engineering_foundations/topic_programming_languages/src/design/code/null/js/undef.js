const user = { name: "Ada" };
console.log(user.email);                         // missing key: undefined, no error
console.log(typeof null, typeof undefined, null == undefined, null === undefined);
console.log(user.email?.toUpperCase() ?? "no email");
console.log(user.email.toUpperCase());           // the error comes later, here
