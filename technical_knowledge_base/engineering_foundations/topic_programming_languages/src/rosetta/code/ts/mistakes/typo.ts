interface Message { user: string; text: string }

function owner(m: Message): string {
  return m.usr; // typo
}

console.log(owner({ user: "u0029", text: "hi" }));
