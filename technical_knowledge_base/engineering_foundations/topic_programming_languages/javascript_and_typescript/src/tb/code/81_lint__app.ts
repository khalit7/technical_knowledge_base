async function save(x: string): Promise<number> {
  return x.length;
}
export async function main(input: any) {
  const unused = 1;
  save(input.text);
  if (input.n == null) return;
  await save("done");
}
