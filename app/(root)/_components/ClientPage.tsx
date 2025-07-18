"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import Header from './Header';
import EditorPanel from './EditorPanel';
import OutputPanel from './OutputPanel';
import { useCollab } from '@/src/hooks/useCollab';
import { useCodeEditorStore } from '@/src/store/useCodeEditorStore';
import { Video, VideoOff } from 'lucide-react';
import { VideoCall } from './VideoCall';
import { useGitHubIntegration } from '@/src/hooks/useGithubIntegration';

interface ClientPageProps {
  userId: string | null;
  convexUser?: { isPro?: boolean };
}

const ClientPage = ({ userId, convexUser: serverConvexUser = { isPro: false } }: ClientPageProps) => {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get('room');
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [collaborativeCode, setCollaborativeCode] = useState("");
  const [collaborativeOutput, setCollaborativeOutput] = useState("");
  const [collaborativeError, setCollaborativeError] = useState<string | null>(null);
  const [isCollaborativeRunning, setIsCollaborativeRunning] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [currentCode, setCurrentCode] = useState<string | null>("");
  
  // Fixed: Use isConnected instead of isConnectedd
  const { isConnected } = useGitHubIntegration();
  
  const { setCollaborating, setCode, language, code } = useCodeEditorStore();

  const handleEditorCodeChange = useCallback((code: string) => {
    setCurrentCode(code);
  }, []);

  // KEY FIX: Add this callback to receive editor instance from EditorPanel
  const handleEditorReady = useCallback((editor: any) => {
    console.log("Editor instance received in ClientPage:", editor);
    setEditorInstance(editor);
  }, []);

  // Fetch fresh user data from Convex on client side
  const clientUserData = useQuery(
    api.users.getUser, 
    user?.id ? { userId: user.id } : "skip"
  );

  // IMPROVED: Get current code from editor instance
  const getCurrentCodeFromEditor = useCallback(() => {
    if (editorInstance) {
      const editorCode = editorInstance.getValue();
      console.log("Getting current code from editor instance:", editorCode.length, "characters");
      return editorCode;
    }
    console.log("Editor instance not available, returning store code:", code?.length || 0, "characters");
    return code || "";
  }, [editorInstance, code]);

  const handleFileContent = (content: string) => {
    if (editorInstance) {
      // Get current cursor position
      const selection = editorInstance.getSelection();
      const position = selection ? selection.getStartPosition() : { lineNumber: 1, column: 1 };
      
      // Insert content at cursor position
      editorInstance.executeEdits('insert-file', [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: content,
        },
      ]);
      
      // Update the store with the new content
      const newCode = editorInstance.getValue();
      setCode(newCode);
      
      // Focus back to editor
      editorInstance.focus();
    } else {
      // Fallback: just set the code if editor instance is not available
      setCode(content);
    }
  };

  // Determine the current user's pro status
  // Priority: client data > server data > default false
  const currentConvexUser = React.useMemo(() => {
    if (clientUserData) {
      console.log("ClientPage: Using client user data:", clientUserData);
      return { isPro: Boolean(clientUserData.isPro) };
    }
    
    console.log("ClientPage: Using server user data:", serverConvexUser);
    return { isPro: Boolean(serverConvexUser?.isPro) };
  }, [clientUserData, serverConvexUser]);

  // Debug logging
  useEffect(() => {
    console.log("ClientPage: User data debug:", {
      userId,
      userClerkId: user?.id,
      serverConvexUser,
      clientUserData,
      currentConvexUser,
      finalHasAccess: Boolean(currentConvexUser?.isPro),
      githubConnected: isConnected,
      editorInstance: !!editorInstance
    });
  }, [userId, user?.id, serverConvexUser, clientUserData, currentConvexUser, isConnected, editorInstance]);

  const { 
    roomId,
    users,
    createRoom,
    joinRoom,
    sendCodeChange,
    leaveRoom,
    isConnected: collabConnected,
    connectionError,
    isConnecting,
    sendRunCode,
    sendOutput,
    activeTypingUser,
    isExecuting,
  } = useCollab({
    onCodeInit: (code: string) => {
      console.log("📝 Initializing collaborative code:", code.length, "characters");
      setCollaborativeCode(code);
      if (typeof setCode === 'function') setCode(code, true);
    },
    onCodeUpdate: (code: string, userId?: string, userName?: string) => {
      console.log("🔄 Updating collaborative code:", code.length, "characters");
      setCollaborativeCode(code);
      if (typeof setCode === 'function') setCode(code, true);
    },
    onRunStart: () => {
      console.log("🚀 Collaborative run started");
      setIsCollaborativeRunning(true);
      setCollaborativeOutput("");
      setCollaborativeError(null);
    },
    onRunComplete: (output: string, error: string | null) => {
      console.log("✅ Collaborative run completed");
      setIsCollaborativeRunning(false);
      setCollaborativeOutput(output);
      setCollaborativeError(error);
    },
    onOutputUpdate: (output: string, error: string | null) => {
      console.log("📊 Output updated from collaboration");
      setCollaborativeOutput(output);
      setCollaborativeError(error);
    }
  });

  // Auto-join room from URL
  useEffect(() => {
    if (roomIdFromUrl && collabConnected && !roomId) {
      console.log("🚪 Auto-joining room from URL:", roomIdFromUrl);
      joinRoom(roomIdFromUrl);
    }
  }, [roomIdFromUrl, collabConnected, roomId, joinRoom]);

  useEffect(() => {
    const isInRoom = Boolean(roomId);
    console.log("🤝 Collaboration state changed:", isInRoom);
    if (typeof setCollaborating === 'function') {
      setCollaborating(isInRoom);
    }
  }, [roomId, setCollaborating]);

  // Define handleOutputChange to avoid compile error
  const handleOutputChange = useCallback(
    (output: string, error: string | null, isRunning: boolean) => {
      // Optionally update collaborative output/error state here
      setCollaborativeOutput(output);
      setCollaborativeError(error);
      setIsCollaborativeRunning(isRunning);
      // If you want to broadcast output to collaborators, uncomment below:
      // if (roomId && sendOutput) sendOutput(output, error);
    },
    [roomId, sendOutput]
  );

  console.log("ClientPage: Final render with convexUser:", currentConvexUser);

  return (
    <div className="min-h-screen">
      <Header 
        convexUser={currentConvexUser} 
        onFileContent={handleFileContent} 
        currentCode={getCurrentCodeFromEditor()} // Pass the function that gets current code
        language={language}
      />
      {roomId && (
        <button
          onClick={() => setIsVideoCallOpen(!isVideoCallOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isVideoCallOpen 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title={isVideoCallOpen ? 'Close video call' : 'Start video call'}
        >
          {isVideoCallOpen ? (
            <>
              <VideoOff className="w-4 h-4" />
              <span>End Call</span>
            </>
          ) : (
            <>
              <Video className="w-4 h-4" />
              <span>Video Call</span>
            </>
          )}
        </button>
      )}
      <div className="max-w-[1800px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EditorPanel
            roomId={roomId}
            onCodeChange={sendCodeChange}
            collaborativeCode={collaborativeCode}
            isCollaborating={Boolean(roomId)}
            activeUser={activeTypingUser}
            sendCodeChange={sendCodeChange}
            onEditorReady={handleEditorReady} // Pass the callback
           />
          
          <OutputPanel
            roomId={roomId}
            onOutputChange={handleOutputChange}
            collaborativeOutput={collaborativeOutput}
            collaborativeError={collaborativeError}
            isCollaborativeRunning={isCollaborativeRunning}
            isCollaborating={Boolean(roomId)}
            sendRunCode={sendRunCode}
            isExecuting={isExecuting}
          />
        </div>
      </div>
       {roomId && (
        <VideoCall
          sessionId={roomId}
          isOpen={isVideoCallOpen}
          onClose={() => setIsVideoCallOpen(false)}
        />
      )}
    </div>
    
  );
};

export default ClientPage;
