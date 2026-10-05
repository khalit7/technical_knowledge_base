// run: always
const state: { value: string | null } = { value: "draft" };
function reset() { state.value = null; }
if (state.value !== null) {
  reset();                                   // tsc does not know reset() changed it
  console.log(state.value.length);           // still narrowed to string
}
