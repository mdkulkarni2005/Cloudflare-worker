// deploy.js
// Usage: bun run deploy.js ./path/to/worker.js --route /myroute
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: bun run deploy.js <worker-file> [--route /path] [--name basename]");
  process.exit(1);
}

let workerSrc = args[0];
let route = null;
let name = null;
for (let i=1; i<args.length; i++) {
  if (args[i] === "--route") { route = args[i+1]; i++; }
  else if (args[i] === "--name") { name = args[i+1]; i++; }
}

if (!fs.existsSync(workerSrc)) {
  console.error("File not found:", workerSrc); process.exit(2);
}

// determine target name
const base = name || path.basename(workerSrc, path.extname(workerSrc));
const targetDir = path.resolve("./workers");
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
const targetPath = path.join(targetDir, base + ".js");

// copy file
fs.copyFileSync(path.resolve(workerSrc), targetPath);
console.log("Copied worker to", targetPath);

// update routes.json if route provided
if (route) {
  const routesPath = path.resolve("./routes.json");
  let routes = {};
  try { routes = JSON.parse(fs.readFileSync(routesPath, "utf8")); } catch(e){}
  routes[route] = base;
  fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
  console.log("Route registered:", route, "→", base);
}

console.log("Deployed", base);
