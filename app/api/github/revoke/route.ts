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

    // Get the GitHub token first
    const tokenData = await convex.query(api.github.getGitHubToken, { userId });
    
    if (tokenData?.accessToken) {
      // Revoke the token on GitHub
      try {
        await fetch(`https://api.github.com/applications/${process.env.GITHUB_CLIENT_ID}/grant`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`).toString('base64')}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            access_token: tokenData.accessToken
          })
        });
      } catch (error) {
        console.log('Failed to revoke token on GitHub, but continuing with local removal');
      }
    }

    // Remove from our database
    await convex.mutation(api.github.removeGitHubToken, { userId });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('GitHub revoke error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}