import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const { name, code } = await req.json();

  const filePath = path.resolve(`../mini-bun-edge/workers/${name}.js`);
  fs.writeFileSync(filePath, code);

  return Response.json({ ok: true });
}
