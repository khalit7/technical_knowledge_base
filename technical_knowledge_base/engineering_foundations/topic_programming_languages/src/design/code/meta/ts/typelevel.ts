// run: no
type Params<S> = S extends `${string}:${infer P}/${infer Rest}` ? P | Params<Rest>
  : S extends `${string}:${infer P}` ? P : never;
type P = Params<"/users/:id/posts/:post">;      // "id" | "post", computed by the checker
const ok: Record<P, string> = { id: "1", post: "2" };
const bad: Record<P, string> = { id: "1" };      // missing "post"
