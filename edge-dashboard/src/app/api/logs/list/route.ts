export async function GET() {
    const logs = await fetch("http://localhost:3000/__logs").then((r) => r.json());
    return Response.json(logs);
  }
  