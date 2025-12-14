import fs from "fs";

export async function GET() {
  const ROUTES_PATH = "/Volumes/Manas HDD/mini-bun-edge/routes.json";

  try {
    const json = JSON.parse(fs.readFileSync(ROUTES_PATH, "utf8"));
    return Response.json(json);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
