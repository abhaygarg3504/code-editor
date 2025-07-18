// app/api/collab/getCode.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    
    if (!sessionId) {
      return new NextResponse("", { status: 200 });
    }
    const code = await fetchQuery(api.collab.getCode, { sessionId: sessionId as Id<"sessions"> });
    return new NextResponse(code || "", {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error("Error getting code:", error);
    return new NextResponse("", { status: 200 });
  }
}