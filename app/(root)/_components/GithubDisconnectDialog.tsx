"use client";

import { X, LogOut, AlertTriangle } from "lucide-react";

interface GitHubDisconnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  username?: string;
  isDisconnecting?: boolean;
}

export function GitHubDisconnectDialog({
  isOpen,
  onClose,
  onConfirm,
  username,
  isDisconnecting = false,
}: GitHubDisconnectDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60  cursor-pointer backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#0a0a0f] border border-red-500/20 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors"
          disabled={isDisconnecting}
        >
          <X className="w-5 h-5 cursor-pointer" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Disconnect GitHub
            </h3>
            <p className="text-sm text-gray-400">
              {username && `Connected as ${username}`}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-300 text-sm leading-relaxed">
            Are you sure you want to disconnect your GitHub account? You'll lose access to:
          </p>
          <ul className="mt-3 space-y-1 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-red-400 rounded-full"></span>
              Repository access and file management
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-red-400 rounded-full"></span>
              Ability to save code directly to GitHub
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-red-400 rounded-full"></span>
              Repository browsing and file loading
            </li>
          </ul>
          <p className="text-gray-300 text-sm leading-relaxed">
  Are you sure you want to disconnect your GitHub account? This will allow you to connect with a different GitHub account next time.
</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm font-medium"
            disabled={isDisconnecting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDisconnecting}
            className="flex-1 px-4 py-2 bg-red-600 cursor-pointer hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {isDisconnecting ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}