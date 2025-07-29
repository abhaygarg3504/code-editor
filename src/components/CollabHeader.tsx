// src/components/CollabHeader.tsx
"use client";

import { useState, useEffect } from "react";
import { Share2Icon, UserPlusIcon, LogOutIcon, MoreHorizontal, Users, Copy, Check, AlertCircle, Wifi, WifiOff, ChevronDown } from "lucide-react";
import { useCollab } from "../hooks/useCollab";
import { v4 as uuidv4 } from 'uuid';
import { useCodeEditorStore } from '../store/useCodeEditorStore';

interface CollabHeaderProps {
  onCodeInit: (code: string) => void;
  onCodeUpdate: (code: string) => void;
  onSendCodeChange?: (callback: (code: string) => void) => void;
  onCodeChangeFromEditor?: (code: string) => void;
}

export function CollabHeader({ 
  onCodeInit, 
  onCodeUpdate, 
  onSendCodeChange,
  onCodeChangeFromEditor 
}: CollabHeaderProps) {
  const { getCode } = useCodeEditorStore();
  
  const { 
    roomId, 
    users, 
    createRoom, 
    joinRoom, 
    leaveRoom, 
    isConnected, 
    connectionError,
    isConnecting,
    sendCodeChange
  } = useCollab({
    onCodeInit,
    onCodeUpdate,
  });
  
  const [joinInput, setJoinInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [customRoomId, setCustomRoomId] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (sendCodeChange && typeof window !== 'undefined') {
      (window as any).sendCodeChangeCallback = sendCodeChange;
    }
  }, [sendCodeChange]);

  const generateRoomId = () => {
    return uuidv4().slice(0, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    if (!isConnected) {
      return;
    }
    createRoom();
    setMobileMenuOpen(false);
  };

  const handleCreateCustomRoom = () => {
    if (customRoomId.trim() && isConnected) {
      const roomIdToJoin = customRoomId.trim();
      joinRoom(roomIdToJoin);
      if (typeof window !== 'undefined') {
        const newUrl = `${window.location.origin}/?room=${roomIdToJoin}`;
        window.history.pushState({ roomId: roomIdToJoin }, '', newUrl);
      }
      
      setCustomRoomId("");
      setShowCustomInput(false);
      setMobileMenuOpen(false);
    }
  };

  const handleJoinRoom = () => {
    if (joinInput.trim() && isConnected) {
      const roomIdToJoin = joinInput.trim();
      joinRoom(roomIdToJoin);
      if (typeof window !== 'undefined') {
        const newUrl = `${window.location.origin}/?room=${roomIdToJoin}`;
        window.history.pushState({ roomId: roomIdToJoin }, '', newUrl);
      }
      
      setJoinInput("");
      setShowJoinInput(false);
      setMobileMenuOpen(false);
    }
  };

  const handleLeaveRoom = () => {
    if (roomId) {
      leaveRoom();
      setMenuOpen(false);
      setMobileMenuOpen(false);
    }
  };

  const copyRoomLink = async () => {
    if (typeof window !== 'undefined' && roomId) {
      const link = `${window.location.origin}/?room=${roomId}`;
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        console.log("📋 Room link copied:", link);
      } catch (error) {
        console.error("Failed to copy room link:", error);
      }
    }
  };

  const copyRoomId = async () => {
    if (roomId) {
      try {
        await navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy room ID:", error);
      }
    }
  };

  const getStatusDisplay = () => {
    if (isConnecting) {
      return {
        icon: <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>,
        text: "Connecting...",
        color: "text-yellow-500"
      };
    }
    
    if (!isConnected) {
      return {
        icon: <WifiOff className="w-4 h-4" />,
        text: connectionError ? `Error: ${connectionError}` : "Disconnected",
        color: "text-red-500"
      };
    }
    
    if (isConnected && !roomId) {
      return {
        icon: <Wifi className="w-4 h-4" />,
        text: "Connected",
        color: "text-green-500"
      };
    }
    
    return {
      icon: <div className="w-2 h-2 rounded-full bg-green-500"></div>,
      text: "Live",
      color: "text-green-500"
    };
  };

  const status = getStatusDisplay();

  useEffect(() => {
    console.log("🔍 CollabHeader state:", {
      isConnected,
      roomId,
      users: users.length,
      connectionError,
      isConnecting
    });
  }, [isConnected, roomId, users, connectionError, isConnecting]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && !(event.target as Element).closest('.menu-container')) {
        setMenuOpen(false);
      }
      if (mobileMenuOpen && !(event.target as Element).closest('.mobile-collab-menu')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, mobileMenuOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomIdFromUrl = urlParams.get('room');
      if (roomIdFromUrl && !roomId && isConnected) {
        joinRoom(roomIdFromUrl);
      }
    }
  }, [isConnected, roomId, joinRoom]);

  return (
    <div className="w-full max-w-full">
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800 p-3 sm:p-4">
        
        {/* Mobile View */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between mb-3">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 ${status.color} text-sm flex-shrink-0`}>
              {status.icon}
              <span className="hidden sm:inline">{status.text}</span>
            </div>

            {/* Mobile Room Info or Menu Toggle */}
            {roomId ? (
              <div className="flex items-center gap-2 flex-1 justify-center">
                <span className="text-xs text-gray-400">Room:</span>
                <button
                  onClick={copyRoomId}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
                >
                  <code className="text-xs font-mono text-blue-400">
                    {roomId}
                  </code>
                </button>
              </div>
            ) : null}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="mobile-collab-menu border-t border-gray-800 pt-3 space-y-3">
              {!roomId ? (
                <>
                  {/* Create Room */}
                  <button
                    onClick={handleCreateRoom}
                    disabled={!isConnected}
                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Create Room
                  </button>

                  {/* Custom Room */}
                  {!showCustomInput ? (
                    <button
                      onClick={() => setShowCustomInput(true)}
                      disabled={!isConnected}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      Custom Room
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Enter custom room ID"
                        value={customRoomId}
                        onChange={(e) => setCustomRoomId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateCustomRoom()}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateCustomRoom}
                          disabled={!customRoomId.trim() || !isConnected}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setShowCustomInput(false);
                            setCustomRoomId("");
                          }}
                          className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Join Room */}
                  {!showJoinInput ? (
                    <button
                      onClick={() => setShowJoinInput(true)}
                      disabled={!isConnected}
                      className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      Join Room
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Enter Room ID to join"
                        value={joinInput}
                        onChange={(e) => setJoinInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleJoinRoom}
                          disabled={!joinInput.trim() || !isConnected}
                          className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
                        >
                          Join
                        </button>
                        <button
                          onClick={() => {
                            setShowJoinInput(false);
                            setJoinInput("");
                          }}
                          className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  {/* Room Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={copyRoomLink}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors text-sm"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2Icon className="w-4 h-4 text-gray-400" />}
                      <span className="text-gray-300">
                        {copied ? 'Copied!' : 'Share'}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors text-sm"
                    >
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{users.length}</span>
                    </button>
                  </div>
                  
                 {/* Participants List */}
{menuOpen && (
  <>
    <div className="fixed inset-0 z-[9998] bg-black/20" onClick={() => setMenuOpen(false)} />
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-[9999] max-h-96 overflow-auto">
      <div className="p-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-300">
                              Participants ({users.length})
                            </span>
                          </div>
                          
                          <div className="space-y-2 mb-3">
                            {users.length > 0 ? (
                              users.map((user, index) => (
                                <div key={typeof user === 'string' ? user : (user?.id ?? index)} className="flex items-center gap-2 text-sm">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <span className="text-gray-300">
                                    {typeof user === 'string' ? user : user?.name || `User ${index + 1}`}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-500">No other participants</div>
                            )}
                          </div>

                          <button
                            onClick={handleLeaveRoom}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <LogOutIcon className="w-4 h-4" />
                            <span>Leave Room</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden lg:flex items-center justify-center gap-4">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 ${status.color} text-sm`}>
            {status.icon}
            <span>{status.text}</span>
          </div>
          
          {!roomId ? (
            <div className="flex items-center gap-4">
              {/* Quick Create Room */}
              <button
                onClick={handleCreateRoom}
                disabled={!isConnected}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {!isConnected && <AlertCircle className="w-4 h-4" />}
                Create Room
              </button>

              {/* Custom Room ID */}
              <div className="flex items-center gap-2">
                {!showCustomInput ? (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    disabled={!isConnected}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    Custom Room
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter custom room ID"
                      value={customRoomId}
                      onChange={(e) => setCustomRoomId(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateCustomRoom()}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleCreateCustomRoom}
                      disabled={!customRoomId.trim() || !isConnected}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomRoomId("");
                      }}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Join Existing Room */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter Room ID to join"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!joinInput.trim() || !isConnected}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  Join
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {/* Room ID Display */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Room:</span>
                <button
                  onClick={copyRoomId}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                >
                  <code className="text-sm font-mono text-blue-400">
                    {roomId}
                  </code>
                </button>
              </div>

              {/* Share Room */}
              <button
                onClick={copyRoomLink}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2Icon className="w-4 h-4 text-gray-400" />}
                <span className="text-gray-300">
                  {copied ? 'Copied!' : 'Share'}
                </span>
              </button>

              {/* Participants */}
              <div className="relative menu-container">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{users.length}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-gray-800 rounded-lg border border-gray-700 shadow-lg z-10">
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-300">
                          Participants ({users.length})
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        {users.length > 0 ? (
                          users.map((user, index) => (
                            <div key={typeof user === 'string' ? user : (user?.id ?? index)} className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-gray-300">
                                {typeof user === 'string' ? user : user?.name || `User ${index + 1}`}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">No other participants</div>
                        )}
                      </div>

                      <button
                        onClick={handleLeaveRoom}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <LogOutIcon className="w-4 h-4" />
                        <span>Leave Room</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}