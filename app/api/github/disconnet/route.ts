
// app/api/github/disconnect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await convex.mutation(api.github.removeGitHubToken, { userId });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('GitHub disconnect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}