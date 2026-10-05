// Read a small file into memory: the Node way (synchronous fs, libuv underneath).
const fs = require("fs");
const s = fs.readFileSync("/work/hello.txt", "utf8"); // uv_fs_open -> open(2), uv_fs_read -> read(2)
console.log(s.length);
