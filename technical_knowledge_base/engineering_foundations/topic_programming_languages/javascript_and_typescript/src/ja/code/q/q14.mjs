// finally overrides return
function f() { try { return "from try"; } finally { console.log("finally runs"); } }
function g() { try { return "from try"; } finally { return "from finally"; } }
console.log(f(), g());
