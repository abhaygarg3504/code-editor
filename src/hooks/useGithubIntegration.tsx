// hooks/useGitHubIntegration.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'react-hot-toast';

export const useGitHubIntegration = () => {
  const { user } = useUser();
  const [isConnecting, setIsConnecting] = useState(false);
  const [localConnectionStatus, setLocalConnectionStatus] = useState<{
    connected: boolean;
    username?: string;
  } | null>(null);

  // Query GitHub connection status - NO refreshKey parameter
  const connectionStatus = useQuery(
    api.github.checkGitHubConnection,
    user?.id ? { userId: user.id } : "skip"
  );

  const removeToken = useMutation(api.github.removeGitHubToken);

  // Update local state when query result changes
  useEffect(() => {
    if (connectionStatus !== undefined) {
      setLocalConnectionStatus(connectionStatus);
    }
  }, [connectionStatus]);

  // Handle GitHub OAuth callback params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const githubConnected = urlParams.get('github_connected');
    const githubError = urlParams.get('github_error');
    
    if (githubConnected === 'true') {
      toast.success('GitHub connected successfully!');
      
      // Force update local state immediately
      setLocalConnectionStatus({ connected: true });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsConnecting(false);
      
      // Clear sessionStorage
      sessionStorage.removeItem('github_connecting');
    }
    
    if (githubError === 'true') {
      const errorMessage = urlParams.get('error_message') || 'Failed to connect GitHub';
      toast.error(decodeURIComponent(errorMessage));
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsConnecting(false);
      sessionStorage.removeItem('github_connecting');
    }
  }, []); // Empty dependency array since we only want this to run once

  // Check if we're returning from GitHub OAuth
  useEffect(() => {
    const isReturningFromGitHub = sessionStorage.getItem('github_connecting');
    if (isReturningFromGitHub && !isConnecting) {
      setIsConnecting(true);
    }
  }, [isConnecting]);

  // Debug logging
  useEffect(() => {
    console.log('GitHub Integration Status:', {
      userId: user?.id,
      connectionStatus,
      localConnectionStatus,
      isConnected: localConnectionStatus?.connected ?? connectionStatus?.connected ?? false,
      username: localConnectionStatus?.username ?? connectionStatus?.username,
      isConnecting
    });
  }, [user?.id, connectionStatus, localConnectionStatus, isConnecting]);

  const connectGitHub = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    if (isConnecting) {
      console.log('Already connecting to GitHub');
      return;
    }

    setIsConnecting(true);
    
    try {
      const currentUrl = window.location.origin + window.location.pathname;
      const response = await fetch('/api/github/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          redirectUrl: currentUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status}${errorData.error ? ` - ${errorData.error}` : ''}`);
      }

      const data = await response.json();
      
      if (data.authUrl) {
        sessionStorage.setItem('github_connecting', 'true');
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get GitHub auth URL');
      }
    } catch (error) {
      console.error('Error connecting to GitHub:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect to GitHub');
      setIsConnecting(false);
    }
  }, [user, isConnecting]);

  // const disconnectGitHub = useCallback(async () => {
  //   if (!user) return;

  //   try {
  //     await removeToken({ userId: user.id });
  //     setLocalConnectionStatus({ connected: false });
  //     toast.success('GitHub disconnected successfully');
  //   } catch (error) {
  //     console.error('Error disconnecting GitHub:', error);
  //     toast.error('Failed to disconnect GitHub');
  //   }
  // }, [user, removeToken]);

  const disconnectGitHub = useCallback(async () => {
  if (!user) return;

  try {
    // Call the revoke endpoint instead of just removing the token
    const response = await fetch('/api/github/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to disconnect GitHub');
    }

    setLocalConnectionStatus({ connected: false });
    toast.success('GitHub disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    toast.error('Failed to disconnect GitHub');
  }
}, [user]);

  const isConnected = localConnectionStatus?.connected ?? connectionStatus?.connected ?? false;
  const username = localConnectionStatus?.username ?? connectionStatus?.username;

  console.log("Final Connection Status:", isConnected);

  return {
    isConnected,
    isConnecting,
    username,
    connectGitHub,
    disconnectGitHub,
    isLoading: connectionStatus === undefined && !!user?.id,
  };
};