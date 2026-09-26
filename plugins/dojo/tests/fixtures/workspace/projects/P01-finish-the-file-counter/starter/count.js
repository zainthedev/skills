// Counts the lines in every file of a directory. Run: node count.js <dir>
const fs = require("node:fs");
const path = require("node:path");

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node count.js <dir>");
  process.exit(2);
}

const files = fs.readdirSync(dir).filter((name) => fs.statSync(path.join(dir, name)).isFile());

for (const name of files) {
  // TODO(dojo): read the file and count its lines, then print "<name> <count>".
  console.log(name);
  throw new Error("TODO(dojo): line counting is not written yet");
}

// TODO(dojo): print the total number of lines across all files.
