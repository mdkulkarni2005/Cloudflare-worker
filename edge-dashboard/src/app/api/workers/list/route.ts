import fs from "fs";
import path from "path";

export async function GET() {
  const dir = path.resolve("../mini-bun-edge/workers");
  const files = fs.readdirSync(dir).map(f => f.replace(".js", ""));
  return Response.json(files);
}
