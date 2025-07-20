// app/api/github/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { redirectUrl } = body;

    // Validate required fields
    if (!redirectUrl) {
      return NextResponse.json({ error: 'Missing redirect URL' }, { status: 400 });
    }

    // GitHub OAuth configuration
    const githubClientId = process.env.GITHUB_CLIENT_ID;
    
    if (!githubClientId) {
      console.error('GitHub client ID not configured');
      return NextResponse.json({ error: 'GitHub integration not configured' }, { status: 500 });
    }

    // Create GitHub OAuth URL
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', githubClientId);
    githubAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`);
    githubAuthUrl.searchParams.set('scope', 'repo user:email');
    githubAuthUrl.searchParams.set('prompt', 'select_account'); 
    githubAuthUrl.searchParams.set('state', JSON.stringify({
      userId,
      redirectUrl,
    }));

    return NextResponse.json({ 
      authUrl: githubAuthUrl.toString(),
      success: true 
    });

  } catch (error) {
    console.error('GitHub auth error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}