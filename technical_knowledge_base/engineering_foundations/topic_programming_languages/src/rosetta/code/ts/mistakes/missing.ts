const perUser = new Map<string, number>([["u0029", 9491]]);

function add(user: string, n: number): void {
  perUser.set(user, perUser.get(user) + n); // get returns number | undefined
}

add("u0777", 5);
console.log(perUser);
