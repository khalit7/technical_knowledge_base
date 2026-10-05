const s = '{"user": {"name": "Ana"}}';
const name: string = JSON.parse(s).user.nmae;
console.log(name.toUpperCase());
