"use client";

import React, { useEffect, useState } from 'react';
import {
  StreamCall,
  CallControls,
  CallingState,
  CallParticipantsList,
  CallStatsButton,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  Call,
} from '@stream-io/video-react-sdk';
import { useStreamVideoClient } from '@stream-io/video-react-sdk';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/nextjs';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone,
  PhoneOff,
  Users,
  Maximize2,
  Minimize2,
  Settings,
  Monitor,
  X
} from 'lucide-react';

interface VideoCallProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({ sessionId, isOpen, onClose }) => {
  const { user } = useUser();
  const client = useStreamVideoClient();
  const [call, setCall] = useState<Call | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callId, setCallId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convex mutations and queries
  const startVideoCall = useMutation(api.videoCall.startVideoCall);
  const updateParticipantMedia = useMutation(api.videoCall.updateParticipantMedia);
  const leaveVideoCall = useMutation(api.videoCall.leaveVideoCall);
  const activeCall = useQuery(api.videoCall.getActiveVideoCall, {
    sessionId: sessionId as Id<"sessions">
  });

  useEffect(() => {
    if (!client || !user || !isOpen) return;

    const initializeCall = async () => {
      setIsInitializing(true);
      setError(null);

      if (!user) {
        setError('User not found');
        setIsInitializing(false);
        return;
      }
      
      const generatedCallId = `session-${sessionId}-${Date.now()}`;
      setCallId(generatedCallId);

      try {
        console.log('🎥 Initializing video call...', generatedCallId);
        
        const result = await startVideoCall({
          sessionId: sessionId as Id<"sessions">,
          callId: generatedCallId,
          userId: user.id,
          userName: user.fullName || user.username || 'Anonymous',
        });

        const callInstance = client.call('default', result.callId);
        setCall(callInstance);

        if (result.isNew) {
          await callInstance.getOrCreate();
        }
        
        await callInstance.join();
        
      } catch (error) {
        console.error(' Error initializing call:', error);
        setError('Failed to initialize video call');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeCall();

    return () => {
      if (call) {
        call.leave().catch(console.error);
        if (user) {
          leaveVideoCall({
            sessionId: sessionId as Id<"sessions">,
            userId: user.id,
          }).catch(console.error);
        }
      }
    };
  }, [client, user, isOpen, sessionId]);

  const handleEndCall = async () => {
    if (call) {
      try {
        await call.leave();
        if (user) {
          await leaveVideoCall({
            sessionId: sessionId as Id<"sessions">,
            userId: user.id,
          });
        }
      } catch (error) {
        console.error('❌ Error ending call:', error);
      }
    }
    setCall(null);
    onClose();
  };

  if (!isOpen) return null;

  if (error) {
    return (
      <div className={`fixed ${isFullscreen ? 'inset-0 z-50' : 'bottom-4 right-4 w-96 h-64'} bg-red-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-red-700 flex items-center justify-center`}>
        <div className="text-center p-6">
          <div className="text-red-400 mb-2">❌</div>
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing || !call) {
    return (
      <div className={`fixed ${isFullscreen ? 'inset-0 z-50' : 'bottom-4 right-4 w-96 h-64'} bg-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing video call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed ${isFullscreen ? 'inset-0 z-50' : 'bottom-4 right-4 w-96 h-64'} bg-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden transition-all duration-300`}>
      <StreamCall call={call}>
        <VideoCallUI 
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onEndCall={handleEndCall}
          onCloseAction={onClose}
          participants={activeCall?.participants || []}
          onUpdateMedia={(isVideoOn, isAudioOn) => {
            updateParticipantMedia({
              sessionId: sessionId as Id<"sessions">,
              userId: user!.id,
              isVideoOn,
              isAudioOn,
            });
          }}
        />
      </StreamCall>
    </div>
  );
};

const VideoCallUI: React.FC<{
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onEndCall: () => void;
  onCloseAction: () => void;
  participants: any[];
  onUpdateMedia: (isVideoOn: boolean, isAudioOn: boolean) => void;
}> = ({ isFullscreen, onToggleFullscreen, onEndCall, onCloseAction, participants, onUpdateMedia }) => {
  const { useCallCallingState, useCameraState, useMicrophoneState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const { camera, isMute: isCameraMute } = useCameraState();
  const { microphone, isMute: isMicMute } = useMicrophoneState();

  const toggleCamera = async () => {
    try {
      await camera.toggle();
      onUpdateMedia(!isCameraMute, !isMicMute);
    } catch (error) {
      console.error('❌ Error toggling camera:', error);
    }
  };

  const toggleMicrophone = async () => {
    try {
      await microphone.toggle();
      onUpdateMedia(!isCameraMute, !isMicMute);
    } catch (error) {
      console.error('❌ Error toggling microphone:', error);
    }
  };

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">
            {callingState === CallingState.JOINING && 'Joining call...'}
            {callingState === CallingState.RECONNECTING && 'Reconnecting...'}
            {callingState === CallingState.MIGRATING && 'Migrating...'}
            {callingState === CallingState.OFFLINE && 'Offline'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <Users className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-200">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFullscreen}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-gray-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={onCloseAction}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
            title="Close video call"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-gray-800">
        {isFullscreen ? (
          <SpeakerLayout participantsBarPosition="bottom" />
        ) : (
          <PaginatedGridLayout />
        )}
      </div>

      {/* Controls */}
      <div className="p-3 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleCamera}
            className={`p-2 rounded-full transition-colors ${
              isCameraMute
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title={isCameraMute ? 'Turn camera on' : 'Turn camera off'}
          >
            {isCameraMute ? (
              <VideoOff className="w-4 h-4 text-white" />
            ) : (
              <Video className="w-4 h-4 text-white" />
            )}
          </button>

          <button
            onClick={toggleMicrophone}
            className={`p-2 rounded-full transition-colors ${
              isMicMute
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title={isMicMute ? 'Turn microphone on' : 'Turn microphone off'}
          >
            {isMicMute ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-white" />
            )}
          </button>

          <button
            onClick={onEndCall}
            className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            title="End call"
          >
            <PhoneOff className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};