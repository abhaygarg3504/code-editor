import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json();
    
    if (!sessionId || !userId) {
      return NextResponse.json({ error: "Session ID and User ID are required" }, { status: 400 });
    }

    const result = await fetchMutation(api.collab.joinRoom, { sessionId, userId });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error joining room:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to join room" 
    }, { status: 500 });
  }
}