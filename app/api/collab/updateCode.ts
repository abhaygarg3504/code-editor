import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, code } = await request.json();
    
    if (!sessionId || code === undefined) {
      return NextResponse.json({ error: "Session ID and code are required" }, { status: 400 });
    }

    const result = await fetchMutation(api.collab.updateCode, { sessionId, code });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating code:", error);
    return NextResponse.json({ error: "Failed to update code" }, { status: 500 });
  }
}