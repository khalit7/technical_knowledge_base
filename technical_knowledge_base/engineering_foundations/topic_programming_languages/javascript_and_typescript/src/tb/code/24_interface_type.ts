interface User { id: number; name: string }
interface User { email?: string }              // interfaces merge
interface Admin extends User { level: 1 | 2 }  // and extend
type Role = "user" | "admin";                  // only an alias can name a union
type Point = { readonly x: number; y: number };
type Labeled = Point & { label: string };      // intersection
const admin: Admin = { id: 1, name: "Ana", level: 2 };
const p: Labeled = { x: 0, y: 1, label: "origin" };
const tally: { [model: string]: number } = {}; // index signature
tally["claude"] = 3;
console.log(admin.name, admin.email, p.label, tally, "user" satisfies Role);
