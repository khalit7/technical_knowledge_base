// process: the running program. argv, env, cwd, exit codes, stdout and stderr.
console.log(process.argv.slice(2));                    // argv[0] is node, argv[1] the script: sys.argv[1:] is slice(2)
console.log(process.env.HOME ? "HOME is set" : "no HOME", process.env.NO_SUCH_VAR);   // missing env vars are undefined
import { parseArgs } from "node:util";                  // a small built-in argparse
const { values, positionals } = parseArgs({ args: process.argv.slice(2), allowPositionals: true,
  options: { top: { type: "string", short: "k", default: "5" }, verbose: { type: "boolean" } } });
console.log(values, positionals);
process.stderr.write("a warning goes to stderr\n");
process.exitCode = 2;                                   // set the exit code and let the program finish normally
