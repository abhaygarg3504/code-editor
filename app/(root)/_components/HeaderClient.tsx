// HeaderClient.tsx
"use client";
import Link from "next/link";
import { Blocks, Code2, Sparkles, Menu, X, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import LanguageSelector from "./LanguageSelector";
import ThemeSelector from "./ThemeSelector";
import HeaderProfileBtn from "./HeaderProfileBtn";
import { CollabHeader } from "@/src/components/CollabHeader";
import { FileManager } from "./FileManager";
import { GitHubAuthDialog } from "./GithubAuthDialog";
import { useGitHubIntegration } from "@/src/hooks/useGithubIntegration";
import { GitHubDisconnectDialog } from "./GithubDisconnectDialog";

interface ConvexUser {
  isPro?: boolean;
}

interface HeaderClientProps {
  convexUser: ConvexUser;
  onFileContentAction?: (content: string) => void;
  currentCode?: string;
  language?: string;
}

export default function HeaderClient({
  convexUser,
  onFileContentAction = () => {},
  currentCode = "",
  language = "javascript",
}: HeaderClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGitHubAuthDialog, setShowGitHubAuthDialog] = useState(false);
  const [showGitHubDisconnectDialog, setShowGitHubDisconnectDialog] = useState(false);
const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { isConnected, isConnecting, isLoading, connectGitHub, username, disconnectGitHub } =
    useGitHubIntegration();

  // Ensure isPro is properly typed as boolean
  const hasAccess = Boolean(convexUser?.isPro);

  // useEffect(() => {
  //   console.log("HeaderClient state:", {
  //     convexUser,
  //     hasAccess,
  //     isConnected,
  //     isConnecting,
  //     isLoading,
  //     username,
  //   });
  // }, [convexUser, hasAccess, isConnected, isConnecting, isLoading, username]);

  const handleGitHubAuth = () => {
    if (isConnected) {
      return;
    }

    if (isConnecting) {
      return;
    }

    if (isLoading) {
      return;
    }

    setShowGitHubAuthDialog(true);
  };

  const handleGitHubConnect = () => {
   setShowGitHubAuthDialog(false);
    connectGitHub();
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuOpen &&
        !(event.target as Element).closest(".mobile-menu-container")
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleDisconnectGithub = async()=>{
    setIsDisconnecting(true)
    try {
      await disconnectGitHub()
      setShowGitHubDisconnectDialog(false)
    } catch(error) {
     console.error('Failed to disconnect:', error);
  } finally {
    setIsDisconnecting(false);
  }
  }

  return (
    <>
      <div className="w-full max-w-full">
        {/* Main Header */}
        <header className="relative z-10 bg-[#0a0a0f]/80 backdrop-blur-xl p-3 sm:p-4 lg:p-6 mb-4 rounded-lg mx-auto">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex gap-4 items-center">
              {/* Logo */}
              <Link
                href="/"
                className="flex items-center gap-2 sm:gap-3 flex-shrink-0"
              >
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0a0a0f] p-1.5 sm:p-2 rounded-xl">
                  <Blocks className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 -rotate-6 group-hover:rotate-0 transition-transform" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm sm:text-lg font-semibold bg-gradient-to-r from-blue-400 via-blue-300 to-purple-400 text-transparent bg-clip-text">
                    CoderCraft
                  </span>
                  <span className="text-xs text-blue-400/60 font-medium hidden sm:block">
                    Interactive Code Editor
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center space-x-4">
                <Link
                  href="/snippets"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 bg-gray-800/50 hover:bg-blue-500/10 border border-gray-800 hover:border-blue-500/50 transition-all duration-300 shadow-lg"
                >
                  <Code2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Snippets</span>
                </Link>
              </nav>
            </div>

            {/* Desktop Controls */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FileManager
                  onFileContent={onFileContentAction}
                  currentCode={currentCode}
                  language={language}
                  onGitHubAuth={handleGitHubAuth}
                  isGitHubConnected={isConnected}
                />

        

{/* Mobile GitHub Status with Disconnect */}
{isConnected && username && (
  <div className="flex items-center gap-2">
    <div className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
      GitHub: {username}
    </div>
    <button
      onClick={() => setShowGitHubDisconnectDialog(true)}
      className="text-xs text-red-400 bg-green-500/10 px-2 py-1 rounded"
      title="Disconnect GitHub"
    >
      <LogOut className="w-3 h-3" />
     Github Logout
    </button>
  </div>
)}

                <ThemeSelector />
                <LanguageSelector hasAccess={hasAccess} />
              </div>

              {!hasAccess ? (
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/20 hover:border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition-all duration-300 whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Upgrade to Pro</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 whitespace-nowrap">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">
                    Pro Member
                  </span>
                </div>
              )}

              <div className="pl-3 border-l border-gray-800">
                <HeaderProfileBtn />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-800/50 transition-colors flex-shrink-0"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation"
            >
              {menuOpen ? (
                <X className="w-5 h-5 text-gray-300" />
              ) : (
                <Menu className="w-5 h-5 text-gray-300" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {menuOpen && (
            <div className="lg:hidden mobile-menu-container">
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex flex-col space-y-3">
                  {/* Mobile Navigation */}
                  <Link
                    href="/snippets"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 bg-gray-800/50 hover:bg-blue-500/10 border border-gray-800 hover:border-blue-500/50 transition-all duration-300"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Code2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Snippets</span>
                  </Link>

                  {/* Mobile Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <FileManager
                      onFileContent={onFileContentAction}
                      currentCode={currentCode}
                      language={language}
                      onGitHubAuth={handleGitHubAuth}
                      isGitHubConnected={isConnected}
                    />
                    <ThemeSelector />
                    <LanguageSelector hasAccess={hasAccess} />
                  </div>

                  {/* GitHub Status */}
                  {isConnected && username && (
                    <div className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded self-start">
                      GitHub: {username}
                    </div>
                  )}

                  {/* Pro Status */}
                  {!hasAccess ? (
                    <Link
                      href="/pricing"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/20 hover:border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition-all duration-300 self-start"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Upgrade to Pro
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 self-start">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-amber-400">
                        Pro Member
                      </span>
                    </div>
                  )}

                  {/* Profile */}
                  <div className="pt-3 border-t border-gray-800">
                    <HeaderProfileBtn />
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Collaboration Header */}
        <div className="mb-4">
          <CollabHeader onCodeInit={() => {}} onCodeUpdate={() => {}} />
        </div>
      </div>

      {/* GitHub Auth Dialog */}
      <GitHubAuthDialog
        isOpen={showGitHubAuthDialog}
        onCloseAction={() => setShowGitHubAuthDialog(false)}
        onAuthorisedAction={handleGitHubConnect}
      />
      <GitHubDisconnectDialog
  isOpen={showGitHubDisconnectDialog}
  onClose={() => setShowGitHubDisconnectDialog(false)}
  onConfirm={handleDisconnectGithub}
  username={username}
  isDisconnecting={isDisconnecting}
/>
    </>
  );
}
