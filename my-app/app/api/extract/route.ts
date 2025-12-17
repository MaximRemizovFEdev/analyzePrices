import { NextResponse } from "next/server";
import { fetchAndExtract } from "../../../lib/extract";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url).searchParams.get("url");
    if (!url) return NextResponse.json({ error: "Missing url param" }, { status: 400 });
    const result = await fetchAndExtract(url);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}