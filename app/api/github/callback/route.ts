// app/api/github/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle GitHub OAuth error
    if (error) {
      console.error('GitHub OAuth error:', error);
      const errorMessage = encodeURIComponent('GitHub authorization failed');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?github_error=true&error_message=${errorMessage}`);
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing code or state parameter');
      const errorMessage = encodeURIComponent('Invalid callback parameters');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?github_error=true&error_message=${errorMessage}`);
    }

    // Parse state
    let stateData;
    try {
      stateData = JSON.parse(state);
    } catch (e) {
      console.error('Invalid state parameter:', e);
      const errorMessage = encodeURIComponent('Invalid state parameter');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?github_error=true&error_message=${errorMessage}`);
    }

    const { userId, redirectUrl } = stateData;

    if (!userId) {
      console.error('Missing userId in state');
      const errorMessage = encodeURIComponent('Missing user ID');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?github_error=true&error_message=${errorMessage}`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to get access token:', tokenData);
      const errorMessage = encodeURIComponent('Failed to get GitHub access token');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?github_error=true&error_message=${errorMessage}`);
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    if (!userData.login) {
      console.error('Failed to get user data:', userData);
      const errorMessage = encodeURIComponent('Failed to get GitHub user data');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?github_error=true&error_message=${errorMessage}`);
    }

    // Store the token and user info in Convex
    try {
      await convex.mutation(api.github.storeGitHubToken, {
        userId: userId,
        accessToken: tokenData.access_token,
        githubUsername: userData.login,
      });
    } catch (convexError) {
      console.error('Failed to store GitHub token in Convex:', convexError);
      const errorMessage = encodeURIComponent('Failed to save GitHub connection');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?github_error=true&error_message=${errorMessage}`);
    }

    // Redirect back to the original URL with success
    const finalRedirectUrl = redirectUrl || process.env.NEXT_PUBLIC_APP_URL;
    return NextResponse.redirect(`${finalRedirectUrl}?github_connected=true`);

  } catch (error) {
    console.error('GitHub callback error:', error);
    const errorMessage = encodeURIComponent('Unexpected error during GitHub connection');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?github_error=true&error_message=${errorMessage}`);
  }
}