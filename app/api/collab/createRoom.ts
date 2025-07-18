
// app/api/collab/createRoom.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function POST(request: NextRequest) {
  try {
    const { ownerId } = await request.json();
    
    if (!ownerId) {
      return NextResponse.json({ error: "Owner ID is required" }, { status: 400 });
    }

    const result = await fetchMutation(api.collab.createRoom, { ownerId });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}