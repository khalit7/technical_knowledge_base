// Date is the old, mutable, millisecond-based API (months count from 0). Temporal replaces it (ES2027; on by default in Node 26).
const d = new Date(2026, 0, 31);                        // January 31: month 0 is January
d.setMonth(1);                                          // "February 31" silently rolls over
console.log(process.version, "Date:", d.toDateString());
if (typeof Temporal === "undefined") console.log(process.version, "Temporal: not available");
else console.log(process.version, "Temporal:", Temporal.PlainDate.from("2026-01-31").add({ months: 1 }).toString());
