import fs from "fs";

export async function POST(req: Request) {
  const ROUTES_PATH = "/Volumes/Manas HDD/mini-bun-edge/routes.json";

  const { path, worker } = await req.json();

  const routes = JSON.parse(fs.readFileSync(ROUTES_PATH, "utf8"));
  routes[path] = worker;

  fs.writeFileSync(ROUTES_PATH, JSON.stringify(routes, null, 2));

  return Response.json({ ok: true });
}
