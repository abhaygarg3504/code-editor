import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCodeEditorStore } from "@/src/store/useCodeEditorStore";

interface CollabUser {
  id: string;
  name: string;
  isTyping?: boolean;
}

export function useCollab({
  onCodeInit,
  onCodeUpdate,
  onOutputUpdate,
  onRunStart,
  onRunComplete,
}: {
  onCodeInit: (code: string) => void;
  onCodeUpdate: (code: string, userId?: string, userName?: string) => void;
  onOutputUpdate?: (output: string, error: string | null) => void;
  onRunStart?: () => void;
  onRunComplete?: (output: string, error: string | null) => void;
}) {
  const { user } = useUser();
  const { language } = useCodeEditorStore();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTypingUser, setActiveTypingUser] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const createRoom = useMutation(api.collab.createRoom);
  const joinRoom = useMutation(api.collab.joinRoom);
  const updateCode = useMutation(api.collab.updateCode);
  const executeCode = useAction(api.collab.executeCode);
  const leaveRoomMutation = useMutation(api.collab.leaveRoom); // Changed from deactivateSession

  const session = useQuery(
    api.collab.getActiveSession,
    roomId ? { sessionId: roomId as Id<"sessions"> } : "skip"
  );
   const collaboratorIds = session?.collaboratorIds ?? [];

  const profileUsers = useQuery(
    api.collab.getUsersByIds,
    { userIds: collaboratorIds }
  );
  
  const sessionCode = useQuery(
    api.collab.getCode,
    roomId ? { sessionId: roomId as Id<"sessions"> } : "skip"
  );

  const latestOutput = useQuery(
    api.collab.getLatestOutput,
    roomId ? { sessionId: roomId as Id<"sessions"> } : "skip"
  );

  const initRef = useRef(onCodeInit);
  const updateRef = useRef(onCodeUpdate);
  const outputUpdateRef = useRef(onOutputUpdate);
  const runStartRef = useRef(onRunStart);
  const runCompleteRef = useRef(onRunComplete);
  const lastCodeRef = useRef<string>("");
  const lastOutputRef = useRef<{output: string, error: string | null} | null>(null);
  const preventInfiniteLoop = useRef(false);

  useEffect(() => {
    initRef.current = onCodeInit;
    updateRef.current = onCodeUpdate;
    outputUpdateRef.current = onOutputUpdate;
    runStartRef.current = onRunStart;
    runCompleteRef.current = onRunComplete;
  }, [onCodeInit, onCodeUpdate, onOutputUpdate, onRunStart, onRunComplete]);

  // Initialize connection when user is loaded
  useEffect(() => {
    if (user) {
      setIsConnected(true);
      setConnectionError(null);
    }
  }, [user]);

  // Handle initial code load when joining a room
  useEffect(() => {
    if (sessionCode !== undefined && roomId && !hasInitialized) {
      console.log("Initializing with existing code:", sessionCode?.substring(0, 50) + "...");
      initRef.current(sessionCode || "");
      lastCodeRef.current = sessionCode || "";
      setHasInitialized(true);
    }
  }, [sessionCode, roomId, hasInitialized]);

  // Handle real-time code updates
  useEffect(() => {
    if (sessionCode !== undefined && 
        roomId && 
        hasInitialized && 
        sessionCode !== lastCodeRef.current &&
        !preventInfiniteLoop.current) {
      
      console.log("Received code update:", sessionCode?.substring(0, 50) + "...");
      updateRef.current(sessionCode || "", undefined, "Collaborator");
      lastCodeRef.current = sessionCode || "";
    }
  }, [sessionCode, roomId, hasInitialized]);

  // Handle real-time output updates
  useEffect(() => {
    if (latestOutput && roomId && outputUpdateRef.current) {
      const currentOutput = {
        output: latestOutput.output,
        error: latestOutput.error ?? null
      };
      
      // Only update if it's different from the last output we processed
      if (!lastOutputRef.current || 
          lastOutputRef.current.output !== currentOutput.output ||
          lastOutputRef.current.error !== currentOutput.error) {
        
        console.log("📥 Received output update:", {
          output: currentOutput.output?.substring(0, 50) + "...",
          error: currentOutput.error?.substring(0, 50) + "..." || null,
          executedBy: latestOutput.executedBy
        });
        
        outputUpdateRef.current(currentOutput.output ?? null, currentOutput.error ?? null);
        lastOutputRef.current = currentOutput;
        
        // Stop execution state
        setIsExecuting(false);
        
        // Notify completion
        if (runCompleteRef.current) {
          runCompleteRef.current(currentOutput.output, currentOutput.error);
        }
      }
    }
  }, [latestOutput, roomId]);

  // Handle session updates (user list)
  useEffect(() => {
    if (session && user) {
      console.log("👥 Session updated:", session.collaboratorIds.length, "users");
      const ordered: CollabUser[] = collaboratorIds.map((id) => {
        const profile = profileUsers?.find((u) => u.id === id);
        return {
          id,
          name: id === user?.id ? "You" : profile?.name || "Unknown",
          isTyping: false,
        };
      });

      setUsers(ordered);
    }
  }, [session, user?.id, profileUsers, collaboratorIds]);

  const createRoomHandler = useCallback(async () => {
    if (!user) {
      setConnectionError("User not authenticated");
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log("🏠 Creating room...");
      const result = await createRoom({ ownerId: user.id });
      const sessionId = result.sessionId;
      setRoomId(sessionId);
      setHasInitialized(false); // Reset for new room
      
      // Update URL
      if (typeof window !== "undefined") {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('room', sessionId);
        window.history.replaceState(null, "", newUrl.toString());
      }
      
      console.log("✅ Room created:", sessionId);
    } catch (error) {
      console.error("❌ Error creating room:", error);
      setConnectionError("Failed to create room");
    } finally {
      setIsConnecting(false);
    }
  }, [user, createRoom]);

  const joinRoomHandler = useCallback(async (sessionId: string) => {
    if (!user || !sessionId.trim()) {
      setConnectionError("Cannot join room");
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log("🚪 Joining room:", sessionId);
      await joinRoom({ 
        sessionId: sessionId.trim() as Id<"sessions">, 
        userId: user.id 
      });
      setRoomId(sessionId.trim());
      setHasInitialized(false); // Reset for joined room
      console.log("✅ Joined room:", sessionId);
    } catch (error) {
      console.error("❌ Error joining room:", error);
      
      // More specific error handling
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Session is not active")) {
        setConnectionError("This session is no longer active. The room may have been closed or expired.");
      } else if (errorMessage.includes("Session not found")) {
        setConnectionError("Room not found. Please check the room ID and try again.");
      } else if (errorMessage.includes("Room is full")) {
        setConnectionError("This room is full (maximum 10 collaborators).");
      } else if (errorMessage.includes("don't have permission")) {
        setConnectionError("You don't have permission to join this inactive session.");
      } else {
        setConnectionError("Failed to join room. Please try again.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [user, joinRoom]);

  const sendCodeChange = useCallback(async (newCode: string) => {
    if (!roomId || !user || preventInfiniteLoop.current) return;

    // Prevent sending same code multiple times
    if (newCode === lastCodeRef.current) return;

    preventInfiniteLoop.current = true;
    
    try {
      console.log("📤 Sending code change to Convex:", newCode.substring(0, 50) + "...");
      await updateCode({ 
        sessionId: roomId as Id<"sessions">, 
        code: newCode,
        userId: user.id
      });
      
      lastCodeRef.current = newCode;
      
      // Set typing indicator
      setActiveTypingUser(user.fullName || user.username || "You");
      setTimeout(() => setActiveTypingUser(null), 1000);
      
    } catch (error) {
      console.error("❌ Error sending code change:", error);
    } finally {
      // Reset the loop prevention after a short delay
      setTimeout(() => {
        preventInfiniteLoop.current = false;
      }, 100);
    }
  }, [roomId, user, updateCode]);

  const sendRunCode = useCallback(async (executionLanguage?: string) => {
    if (!roomId || !user) return;
    
    // Use the passed language or fall back to current language
    const langToUse = executionLanguage || language;
    
    console.log("🏃 Triggering collaborative execution for language:", langToUse);
    setIsExecuting(true);
    
    // Notify that execution started
    if (runStartRef.current) {
      runStartRef.current();
    }
    
    try {
      await executeCode({
        sessionId: roomId as Id<"sessions">,
        language: langToUse,
        userId: user.id
      });
      console.log("✅ Code execution initiated");
    } catch (error) {
      console.error("❌ Error executing code:", error);
      setIsExecuting(false);
      
      // Handle the error through the output callback
      if (outputUpdateRef.current) {
        outputUpdateRef.current("", `Execution failed: ${error}`);
      }
    }
  }, [roomId, user, executeCode, language]);

  const sendOutput = useCallback((output: string, error: string | null) => {
    if (!roomId) return;
    
    console.log("📤 Broadcasting output:", { output: output?.substring(0, 50), error });
    if (outputUpdateRef.current) {
      outputUpdateRef.current(output, error);
    }
  }, [roomId]);

  const leaveRoom = useCallback(async () => {
    if (!roomId || !user) return;

    try {
      console.log("🚪 Leaving room:", roomId);
      // Use the proper leaveRoom mutation instead of deactivateSession
      await leaveRoomMutation({ 
        sessionId: roomId as Id<"sessions">, 
        userId: user.id 
      });
      
      setRoomId(null);
      setUsers([]);
      setActiveTypingUser(null);
      setHasInitialized(false);
      setIsExecuting(false);
      
      if (typeof window !== 'undefined') {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('room');
        window.history.replaceState(null, "", newUrl.toString());
      }
      
      console.log("✅ Successfully left room");
    } catch (error) {
      console.error("❌ Error leaving room:", error);
    }
  }, [roomId, user, leaveRoomMutation]);

  return {
    roomId,
    users,
    createRoom: createRoomHandler,
    joinRoom: joinRoomHandler,
    sendCodeChange,
    leaveRoom,
    isConnected,
    connectionError,
    isConnecting,
    sendRunCode,
    sendOutput,
    activeTypingUser,
    isExecuting,
  };
}
