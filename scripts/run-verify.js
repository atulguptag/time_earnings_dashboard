// Compiles src/lib + the verification suite to CommonJS and runs it, mapping
// the "@/..." path alias onto the build output.
const { execSync } = require("child_process");
const path = require("path");
const Module = require("module");

execSync("npx tsc -p tsconfig.scripts.json", { stdio: "inherit" });

const root = path.join(__dirname, "..", ".verify");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith("@/")) request = path.join(root, "src", request.slice(2));
  return orig.call(this, request, ...rest);
};
require(path.join(root, "scripts", "verify-lib.js"));
