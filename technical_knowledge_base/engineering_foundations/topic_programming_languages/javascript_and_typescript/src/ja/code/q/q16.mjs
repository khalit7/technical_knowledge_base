// Using a let before its line
let x = "outer";
{
  try { console.log(x); } catch (e) { console.log(e.name + ": " + e.message); }
  let x = "inner";
  console.log(x);
}
