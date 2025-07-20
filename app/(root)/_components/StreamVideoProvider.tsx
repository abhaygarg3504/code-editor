'use client';

import { StreamVideo, StreamVideoClient } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

export const StreamVideoProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !apiKey) return;

    const initializeClient = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        const client = new StreamVideoClient({
          apiKey,
          user: {
            id: user.id,
            name: user.fullName || user.username || 'Anonymous',
            image: user.imageUrl,
          },
          tokenProvider: async () => {
            const response = await fetch('/api/stream-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                userName: user.fullName || user.username || 'Anonymous',
              }),
            });
            
            if (!response.ok) {
              throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.token;
          },
        });

        setVideoClient(client);
      } catch (error) {
        console.error('Error initializing Stream Video client:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize video client');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeClient();

    return () => {
      if (videoClient) {
        videoClient.disconnectUser().catch(console.error);
      }
    };
  }, [user]);

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing video services...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 mb-4">❌</div>
          <h2 className="text-xl font-bold text-white mb-2">Video Service Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            You can still use the code editor, but video calling won't be available.
          </p>
        </div>
      </div>
    );
  }

  // Don't render children until we have a video client or if we don't have a user
  if (!videoClient && user) {
    return null;
  }

  // If no user is logged in, render children without video client
  if (!user) {
    return <>{children}</>;
  }

  // Only render StreamVideo if videoClient is not null
  if (videoClient) {
    return <StreamVideo client={videoClient}>{children}</StreamVideo>;
  }

  // Fallback: render nothing or a loading state if needed
  return null;
};