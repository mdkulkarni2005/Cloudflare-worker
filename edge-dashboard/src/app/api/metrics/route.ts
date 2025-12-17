import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://localhost:3000/api/metrics", {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({}, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}
