// Reading a #private field from outside its class is not a run-time error: the file does not even start.
class Box { #secret = 42; }
console.log("this line never runs");
console.log(new Box().#secret);
