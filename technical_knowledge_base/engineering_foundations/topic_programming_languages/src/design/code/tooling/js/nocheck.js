function neverCalled() {
  return undfined_variable + 1;     // a typo: nothing complains until this runs
}
console.log("ran fine");
