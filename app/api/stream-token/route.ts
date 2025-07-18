import { StreamChat } from 'stream-chat';
import { NextRequest, NextResponse } from 'next/server';

const serverClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY!,
  process.env.STREAM_API_SECRET!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, userName } = await request.json();

    if (!userId || !userName) {
      return NextResponse.json(
        { error: 'Missing userId or userName' }, 
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
      console.error('❌ Stream API credentials not found in environment variables');
      return NextResponse.json(
        { error: 'Stream API credentials not configured' }, 
        { status: 500 }
      );
    }

    console.log('🎥 Generating Stream token for user:', userId);

    // Generate token for video calling
    const token = serverClient.createToken(userId);

    console.log('🎥 Stream token generated successfully for user:', userId);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('❌ Error generating Stream token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' }, 
      { status: 500 }
    );
  }
}