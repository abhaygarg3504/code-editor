"use client";
import { useCodeEditorStore } from "@/src/store/useCodeEditorStore";
import { useEffect, useState, useRef } from "react";
import { defineMonacoThemes, LANGUAGE_CONFIG } from "../_constants";
import { RotateCcwIcon, ShareIcon, TypeIcon, User, Download, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { Editor } from "@monaco-editor/react";
import { useClerk } from "@clerk/clerk-react";
import { EditorPanelSkeleton } from "./EditorPanelSkeleton";
import useMounted from "@/src/hooks/useMounted";
import ShareDialogSnippet from "./ShareDialogSnippet";

interface EditorPanelProps {
  roomId?: string | null;
  onCodeChange?: (code: string) => void;
  collaborativeCode?: string;
  isCollaborating?: boolean;
  activeUser?: string | null;
  sendCodeChange?: (code: string) => void; 
  sendTyping?: (isTyping: boolean) => void;
  onEditorReady?: (editor: any) => void; // Add this prop to pass editor instance up
}

function EditorPanel({ 
  roomId, 
  onCodeChange, 
  collaborativeCode, 
  isCollaborating = false,
  activeUser = null,
  sendCodeChange,
  onEditorReady // Add this prop
}: EditorPanelProps) {
  const clerk = useClerk();
  const [shareDialogue, setShareDialogue] = useState(false);
  const [isSettingCode, setIsSettingCode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>(""); // This will track the actual editor content
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCodeRef = useRef<string>("");
  const [isUpdatingFromCollab, setIsUpdatingFromCollab] = useState(false);

  const {
    language,
    theme,
    fontSize,
    editor,
    setFontSize,
    setEditor,
    setCollaborating,
    getCode,
    setCode,
  } = useCodeEditorStore();
  
  // Set collaboration state
  useEffect(() => {
    if (typeof setCollaborating === 'function') {
      setCollaborating(isCollaborating);
    }
  }, [isCollaborating, setCollaborating]);

  // THIS IS THE KEY FIX: Update currentCode whenever editor content changes
  useEffect(() => {
    if (editor && !isSettingCode && !isUpdatingFromCollab) {
      const code = editor.getValue();
      setCurrentCode(code);
      // Update store as well
      if (typeof setCode === 'function') {
        setCode(code);
      }
    }
  }, [editor, setCode, isSettingCode, isUpdatingFromCollab]);

  // Real-time sync with editor content
  useEffect(() => {
    if (editor) {
      const disposable = editor.onDidChangeModelContent(() => {
        if (!isSettingCode && !isUpdatingFromCollab) {
          const code = editor.getValue();
          setCurrentCode(code);
          if (typeof setCode === 'function') {
            setCode(code);
          }
        }
      });

      return () => disposable.dispose();
    }
  }, [editor, setCode, isSettingCode, isUpdatingFromCollab]);

  useEffect(() => {
    if (collaborativeCode !== undefined && editor && isCollaborating && !isSettingCode) {
      const currentCode = editor.getValue();

      if (currentCode !== collaborativeCode && lastCodeRef.current !== collaborativeCode) {
        setIsSettingCode(true);
        const position = editor.getPosition();
        const selection = editor.getSelection();
        editor.setValue(collaborativeCode);
        setCurrentCode(collaborativeCode); // Update current code state
        if (position) {
          editor.setPosition(position);
        }
        if (selection) {
          editor.setSelection(selection);
        }
        lastCodeRef.current = collaborativeCode;
        
        setTimeout(() => setIsSettingCode(false), 100);
      }
    }
  }, [collaborativeCode, editor, isCollaborating, isSettingCode]);

  // Load initial code (only when not collaborating)
  useEffect(() => {
    if (!isCollaborating && editor) {
      const savedCode = localStorage.getItem(`editor-code-${language}`);
      const newCode = savedCode || LANGUAGE_CONFIG[language].defaultCode;
      editor.setValue(newCode);
      setCurrentCode(newCode); // Update current code state
      lastCodeRef.current = newCode;
    }
  }, [language, editor, isCollaborating]);

  useEffect(() => {
    if (collaborativeCode !== undefined && editor && isCollaborating && !isSettingCode && !isUpdatingFromCollab) {
      const currentCode = editor.getValue();
      if (currentCode !== collaborativeCode) {
        setIsSettingCode(true);
        setIsUpdatingFromCollab(true);
        const position = editor.getPosition();
        const selection = editor.getSelection();
        editor.setValue(collaborativeCode);
        setCurrentCode(collaborativeCode); // Update current code state
        if (position && position.lineNumber <= editor.getModel()?.getLineCount()!) {
          editor.setPosition(position);
        }
        if (selection) {
          editor.setSelection(selection);
        }
        
        setTimeout(() => {
          setIsSettingCode(false);
          setIsUpdatingFromCollab(false);
        }, 150);
      }
    }
  }, [collaborativeCode, editor, isCollaborating, isSettingCode, isUpdatingFromCollab]);

  // Load saved font size
  useEffect(() => {
    const savedFontSize = localStorage.getItem("editor-font-size");
    if (savedFontSize && typeof setFontSize === "function") {
      setFontSize(parseInt(savedFontSize));
    }
  }, [setFontSize]);

  const handleRefresh = () => {
    const defaultCode = LANGUAGE_CONFIG[language].defaultCode;
    if (editor) {
      editor.setValue(defaultCode);
      setCurrentCode(defaultCode); // Update current code state
      if (isCollaborating && roomId) {
        if (sendCodeChange) {
          sendCodeChange(defaultCode);
        } else if (onCodeChange) {
          onCodeChange(defaultCode);
        }
      } else {
        // Only remove from localStorage if not collaborating
        localStorage.removeItem(`editor-code-${language}`);
      }
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (isSettingCode || isUpdatingFromCollab) return; // Prevent recursive updates
    
    const code = value || "";
    setCurrentCode(code); // Update current code state immediately
    
    if (isCollaborating && roomId) {
      // Debounce code changes to prevent too many API calls
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (sendCodeChange) {
          sendCodeChange(code);
        } else if (onCodeChange) {
          onCodeChange(code);
        }
      }, 300); // 300ms debounce
      
      // Handle typing indicators
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    } else {
      // Save to localStorage only when not collaborating
      localStorage.setItem(`editor-code-${language}`, code);
    }
  };

  const handleFontSizeChange = (newSize: number) => {
    const size = Math.min(Math.max(newSize, 12), 24);
    if (typeof setFontSize === "function") {
      setFontSize(size);
    }
    localStorage.setItem("editor-font-size", size.toString());
  };

  // MOST IMPORTANT: Function to get the actual current code from editor
  const getCurrentCode = () => {
    if (editor) {
      const editorCode = editor.getValue();
      return editorCode;
    }
    return currentCode;
  };

  const mount = useMounted();

  if (!mount) return <EditorPanelSkeleton />;

  return (
    <div className="relative">
      <div className="relative bg-[#12121a]/90 backdrop-blur rounded-xl border border-white/[0.05] p-6">
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1e1e2e] ring-1 ring-white/5">
              <img src={`/${language}.png`} alt="Logo" width={24} height={24} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-white">
                Code Editor
                {isCollaborating && (
                  <span className="ml-2 px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
                    Live
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500">
                {isCollaborating 
                  ? "Collaborative editing enabled" 
                  : "Write and execute your code"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Font Size Slider */}
            <div className="flex items-center gap-3 px-3 py-2 bg-[#1e1e2e] rounded-lg ring-1 ring-white/5">
              <TypeIcon className="size-4 text-gray-400" />
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={12}
                  max={24}
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                  className="w-20 h-1 bg-gray-600 rounded-lg cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-400 min-w-[2rem] text-center">
                  {fontSize}
                </span>
              </div>
            </div>

          
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="p-2 bg-[#1e1e2e] hover:bg-[#2a2a3a] rounded-lg ring-1 ring-white/5 transition-colors"
              aria-label="Reset to default code"
            >
              <RotateCcwIcon className="size-4 text-gray-400" />
            </motion.button>

            {/* Share Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShareDialogue(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 opacity-90 hover:opacity-100 transition-opacity"
            >
              <ShareIcon className="size-4 text-white" />
              <span className="text-sm font-medium text-white">Share</span>
            </motion.button>
          </div>
        </div>

        {/* Collaboration Status */}
        {isCollaborating && roomId && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>
                  You're collaborating in room: <code className="bg-green-500/20 px-1 rounded">{roomId}</code>
                </span>
              </div>
              
              {/* Active User Indicator */}
              {activeUser && activeUser !== "You" && (
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <User className="w-4 h-4" />
                  <span>{activeUser} is typing...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="relative group rounded-xl overflow-hidden ring-1 ring-white/[0.05]">
          {clerk.loaded ? (
            <Editor
              height="600px"
              language={LANGUAGE_CONFIG[language].monacoLanguage}
              onChange={handleEditorChange}
              theme={theme}
              beforeMount={defineMonacoThemes}
              onMount={(editor) => { 
                if (typeof setEditor === "function") {
                  setEditor(editor);
                }
                // Pass editor instance to parent component
                if (onEditorReady) {
                  onEditorReady(editor);
                }
                // Set initial code state when editor mounts
                const initialCode = editor.getValue();
                setCurrentCode(initialCode);
              }}
              options={{
                minimap: { enabled: false },
                fontSize,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                renderWhitespace: "selection",
                fontFamily: '"Fira Code", "Cascadia Code", Consolas, monospace',
                fontLigatures: true,
                cursorBlinking: "smooth",
                smoothScrolling: true,
                contextmenu: true,
                renderLineHighlight: "all",
                lineHeight: 1.6,
                letterSpacing: 0.5,
                roundedSelection: true,
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
              }}
            />
          ) : (
            <EditorPanelSkeleton />
          )}
        </div>
      </div>
      {shareDialogue && <ShareDialogSnippet onClose={() => setShareDialogue(false)} />}
    </div>
  );
}

export default EditorPanel;