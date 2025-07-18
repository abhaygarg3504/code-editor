// components/GitHubAuthDialog.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Github, X } from 'lucide-react';

interface GitHubAuthDialogProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onAuthorisedAction: () => void;
}

export const GitHubAuthDialog: React.FC<GitHubAuthDialogProps> = ({
  isOpen,
  onCloseAction,
  onAuthorisedAction
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#1e1e2e] rounded-lg p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Github className="w-5 h-5" />
            Connect GitHub
          </h3>
          <button
            onClick={onCloseAction}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Connect your GitHub account to save and load files from your repositories.
          </p>
          <div className="text-sm text-gray-400 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Access your repositories</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Save code directly to GitHub</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Load files from your repos</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCloseAction}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAuthorisedAction}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors flex items-center justify-center gap-2"
          >
            <Github className="w-4 h-4" />
            Connect GitHub
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};