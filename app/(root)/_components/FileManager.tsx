
import React, { useState, useRef, useEffect } from 'react';
import {
  File,
  Upload,
  Download,
  Github,
  FolderOpen,
  Save,
  ChevronDown,
  X,
  Loader2,
  Folder,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'react-hot-toast';

interface FileManagerProps {
  onFileContent: (content: string) => void;
  currentCode: string;
  language: string;
  onGitHubAuth: () => void;
  isGitHubConnected: boolean;
}

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  sha: string;
}

export const FileManager: React.FC<FileManagerProps> = ({
  onFileContent,
  currentCode,
  language,
  onGitHubAuth,
  isGitHubConnected
}) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showGitHubRepos, setShowGitHubRepos] = useState(false);
  const [showGitHubSave, setShowGitHubSave] = useState(false);
  const [showGitHubFiles, setShowGitHubFiles] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [repoFiles, setRepoFiles] = useState<GitHubFile[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [filePath, setFilePath] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const githubFileRef = useRef<HTMLButtonElement | null>(null);
  const githubRepoRef = useRef<HTMLButtonElement | null>(null)
  

  // Check GitHub connection status directly from Convex
  const githubConnection = useQuery(
    api.github.checkGitHubConnection,
    user?.id ? { userId: user.id } : "skip"
  );

  // Convex mutations
  const fetchRepos = useAction(api.github.fetchGitHubRepos);
  const fetchFile = useAction(api.github.fetchGitHubFile);
  const saveToGitHub = useAction(api.github.saveToGitHub);
  const fetchRepoContents = useAction(api.github.fetchRepoContents);

  // Determine if GitHub is actually connected
  const isActuallyConnected = githubConnection?.connected || false;

  // Clear error when closing dropdowns
  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const getFileExtension = (lang: string) => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      html: 'html',
      css: 'css',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      kotlin: 'kt',
      swift: 'swift',
      csharp: 'cs',
      bash: 'sh'
    };
    return extensions[lang] || 'txt';
  };

  const handleOpenLocal = () => fileInputRef.current?.click();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onFileContent(reader.result as string);
        toast.success('File loaded successfully!');
        setIsOpen(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
      };
      reader.readAsText(file);
    }
  };

  const handleSaveLocal = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  try {
    // Check if there's code to save
    if (!currentCode || currentCode.trim() === '') {
      toast.error('No code to save');
      return;
    }

    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${getFileExtension(language)}`;
    a.style.display = 'none'; // Hide the element
    
    // Append to body, click, and remove
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    toast.success('File downloaded successfully!');
    setIsOpen(false);
  } catch (error) {
    console.error('Error saving file:', error);
    toast.error('Failed to download file. Please try again.');
  }
};

  const checkGitHubConnection = () => {
    if (!user?.id) {
      toast.error('Please sign in first');
      return false;
    }

    if (!isActuallyConnected) {
      console.log('GitHub not connected, triggering auth...');
      onGitHubAuth();
      return false;
    }

    return true;
  };

  const fetchGitHubRepos = async () => {
    console.log('Fetching GitHub repos...', {
      isActuallyConnected,
      isGitHubConnected,
      githubConnection,
      userId: user?.id
    });

    if (!checkGitHubConnection()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchRepos({ userId: user!.id });
      console.log('Fetched repos:', data);
      
      if (!data || data.length === 0) {
        setError('No repositories found');
        return;
      }
      
      setRepos(data);
      setShowGitHubRepos(true);
    } catch (error) {
      console.error('Error fetching repos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch GitHub repos';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

const repoModalRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  if ((showGitHubRepos || showGitHubFiles) && repoModalRef.current) {
    repoModalRef.current.scrollTop = 0;
  }
}, [showGitHubRepos, showGitHubFiles, repos, repoFiles]);


  const handleRepoSelect = async (fullName: string) => {
    setSelectedRepo(fullName);
    setCurrentPath('');
    setIsLoading(true);
    setError(null);
    
    try {
      const contents = await fetchRepoContents({ userId: user!.id, repo: fullName });
      setRepoFiles(contents);
      setShowGitHubRepos(false);
      setShowGitHubFiles(true);
    } catch (error) {
      console.error('Error loading repo contents:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load repo contents';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileOrFolderClick = async (item: GitHubFile) => {
    if (item.type === 'dir') {
      setCurrentPath(item.path);
      setIsLoading(true);
      setError(null);
      
      try {
        const contents = await fetchRepoContents({
          userId: user!.id,
          repo: selectedRepo,
          path: item.path
        });
        setRepoFiles(contents);
      } catch (error) {
        console.error('Error fetching folder contents:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch folder contents';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      setError(null);
      
      try {
        const fileData = await fetchFile({ 
          userId: user!.id, 
          repo: selectedRepo, 
          path: item.path 
        });
        
        // Check if the file content is too large or binary
        if (fileData.content.length > 1000000) { // 1MB limit
          throw new Error('File is too large to display (> 1MB)');
        }
        
        onFileContent(fileData.content);
        toast.success(`File "${item.name}" loaded from GitHub!`);
        setShowGitHubFiles(false);
        setIsOpen(false);
      } catch (error) {
        console.error('Error loading file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load file';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveToGitHub = async () => {
    if (!selectedRepo || !filePath || !commitMessage) {
      toast.error('Please fill all fields');
      return;
    }
    
    if (!checkGitHubConnection()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      await saveToGitHub({
        userId: user!.id,
        repo: selectedRepo,
        path: filePath,
        content: currentCode,
        message: commitMessage
      });
      toast.success('Saved to GitHub!');
      setShowGitHubSave(false);
      setIsOpen(false);
      setSelectedRepo('');
      setFilePath('');
      setCommitMessage('');
    } catch (error) {
      console.error('Error saving to GitHub:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save to GitHub';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToGitHubClick = async () => {
    console.log('Save to GitHub clicked', {
      isActuallyConnected,
      isGitHubConnected,
      githubConnection,
      userId: user?.id
    });

    if (!checkGitHubConnection()) return;

    // Fetch repos first, then show save dialog
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchRepos({ userId: user!.id });
      setRepos(data);
      setShowGitHubSave(true);
    } catch (error) {
      console.error('Error fetching repos for save:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch GitHub repos';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const goBackInPath = () => {
    if (!currentPath) return;
    const parent = currentPath.split('/').slice(0, -1).join('/');
    setCurrentPath(parent);
    setIsLoading(true);
    setError(null);
    
    fetchRepoContents({ userId: user!.id, repo: selectedRepo, path: parent || undefined })
      .then(setRepoFiles)
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Failed to navigate back';
        setError(errorMessage);
        toast.error(errorMessage);
      })
      .finally(() => setIsLoading(false));
  };

  const closeAllModals = () => {
    setShowGitHubRepos(false);
    setShowGitHubFiles(false);
    setShowGitHubSave(false);
    setSelectedRepo('');
    setCurrentPath('');
    setFilePath('');
    setCommitMessage('');
    setError(null);
  };


  function toogleFileDropdown(e : MouseEvent){
    e.preventDefault()
    setIsOpen(true);
    if(triggerRef.current && !triggerRef.current.contains(e.target as Node)){
      setIsOpen(false)
      document.removeEventListener("click",toogleFileDropdown)
    }
  }

  function ToggleGithubFileDropDown(e : MouseEvent){
    e.preventDefault();
    setShowGitHubFiles(true)
    if(githubFileRef.current && !githubFileRef.current.contains(e.target as Node)){
      setShowGitHubFiles(false)
       document.removeEventListener("click",ToggleGithubFileDropDown)
    }
  }
  function ToggleGithubRepoDropDown(e : MouseEvent){
    e.preventDefault();
    setShowGitHubFiles(true)
    if(githubFileRef.current && !githubFileRef.current.contains(e.target as Node)){
      setShowGitHubFiles(false)
       document.removeEventListener("click",ToggleGithubFileDropDown)
    }
  }

  const handleOutsideClick = () => {
    setIsOpen(true)
    document.addEventListener("click",toogleFileDropdown)
  }
  const handleOutsideFileClick = ()=>{
    setShowGitHubFiles(true)
    document.addEventListener("click", ToggleGithubFileDropDown)
  }
  const handleOutsideRepoClick = ()=>{
    setShowGitHubRepos(true)
    document.addEventListener("click", ToggleGithubRepoDropDown)
  }


const filesModalRef = useRef<HTMLDivElement | null>(null);
const saveModalRef  = useRef<HTMLDivElement | null>(null);


function useOutsideClick<T extends HTMLElement>(
  ref: React.RefObject<T> | React.MutableRefObject<T | null>,
  isOpen: boolean,
  onClose: () => void
) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const el = ref.current;
      if (isOpen && el && !el.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [ref, isOpen, onClose]);
}
useOutsideClick(repoModalRef,  showGitHubRepos, closeAllModals);
useOutsideClick(filesModalRef, showGitHubFiles, closeAllModals);
useOutsideClick(saveModalRef,  showGitHubSave,  closeAllModals);

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.js,.ts,.py,.java,.cpp,.c,.html,.css,.php,.rb,.go,.rs,.kt,.swift,.cs,.sh"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={handleOutsideClick}
        ref={triggerRef}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#1e1e2e] hover:bg-[#2a2a3a] rounded-lg ring-1 ring-white/5 transition-colors"
      >
        <File className="w-4 h-4 text-gray-400" />
        <span className="font-medium text-gray-300">File</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-64 bg-[#1e1e2e] rounded-lg shadow-2xl z-50 ring-1 ring-white/10"
          >
            <div className="p-2">
              <button 
                onClick={handleOpenLocal} 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a3a] rounded-lg transition-colors"
              >
                <FolderOpen className="w-4 h-4" /> 
                Open from Local
              </button>
              
              <button 
              type='button'
                onClick={handleSaveLocal} 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a3a] rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" /> 
                Save to Local
              </button>
              
              <div className="my-2 h-px bg-white/10" />
              
              <button 
                onClick={fetchGitHubRepos} 
                disabled={isLoading} 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a3a] rounded-lg disabled:opacity-50 transition-colors"
              >
                <Github className="w-4 h-4" /> 
                Open from GitHub
                {isActuallyConnected && (
                  <CheckCircle className="w-3 h-3 text-green-400 ml-auto" />
                )}
                {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>
              
              <button 
                onClick={handleSaveToGitHubClick} 
                disabled={isLoading} 
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a3a] rounded-lg disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" /> 
                Save to GitHub
                {isActuallyConnected && (
                  <CheckCircle className="w-3 h-3 text-green-400 ml-auto" />
                )}
                {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </button>
              
              {error && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GitHub Repos Modal */}
      <AnimatePresence>
        {showGitHubRepos && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20">
            <motion.div 
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.9 }} 
              ref={repoModalRef}
              className="bg-[#1e1e2e] rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Select Repository</h3>
                <button 
                  onClick={closeAllModals} 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-2">
                {repos.map(repo => (
                 <motion.button 
  key={repo.id}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: repos.indexOf(repo) * 0.1 }}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  onClick={() => handleRepoSelect(repo.full_name)} 
   className={`   relative group w-full text-left p-3 rounded-lg transition-all duration-200 border
     ${selectedRepo === repo.full_name      ? 'bg-blue-500/10 text-blue-400 border-blue-400'
     : 'bg-[#2a2a3a]/80 text-gray-300 border-gray-800/50 hover:bg-[#262637] hover:border-gray-700'}
    `}
  
  >
  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />

 <div className="relative">
       
   <div className="font-medium group-hover:text-blue-300 transition-colors">
     {repo.name}
   </div>
   <div className="text-sm truncate group-hover:text-gray-300 transition-colors">
     {repo.description || 'No description'}
   </div>
 </div>
                 </motion.button>
                ))}
              </div>
              
              {isLoading && (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GitHub Files Modal */}
      <AnimatePresence>
        {showGitHubFiles && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            ref={filesModalRef}
            className="fixed inset-0  bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div 
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.9 }} 
              className="bg-[#1e1e2e] rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
            >
              <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-6 pb-4 border-b border-gray-800/50 shrink-0">
               <h3 className="text-lg font-semibold text-white truncate">
                  {selectedRepo}{currentPath ? `/${currentPath}` : ''}
                </h3>
                <div className="flex gap-2">
                  {currentPath && (
                    <button 
                      onClick={goBackInPath} 
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Go back"
                    >
                      <FolderOpen className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={closeAllModals} 
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
              
              <div className="flex-1 overflow-hidden flex">
          {/* Directories Column */}
          <div className="w-1/2 border-r border-gray-800/50 p-4 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Folders
            </h4>
            <div className="space-y-1">
              {repoFiles.filter(item => item.type === 'dir').map((item, index) => (
                <motion.button 
                  key={item.sha}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleFileOrFolderClick(item)} 
                  className="relative group w-full flex items-center gap-2 p-2 bg-[#2a2a3a]/50 hover:bg-[#262637] rounded-md transition-all duration-200 border border-transparent hover:border-blue-500/30"
                >
                  <Folder className="w-4 h-4 text-blue-300 flex-shrink-0" />
                  <span className="flex-1 text-left text-gray-200 text-xs truncate group-hover:text-white transition-colors">
                    {item.name}
                  </span>
                </motion.button>
              ))}
              {repoFiles.filter(item => item.type === 'dir').length === 0 && !isLoading && (
                <div className="text-xs text-gray-500 italic p-2">No folders</div>
              )}
            </div>
          </div>
          
          {/* Files Column */}
          <div className="w-1/2 p-4 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <File className="w-4 h-4" />
              Files
            </h4>
            <div className="space-y-1">
              {repoFiles.filter(item => item.type === 'file').map((item, index) => (
                <motion.button 
                  key={item.sha}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleFileOrFolderClick(item)} 
                  className="relative group w-full flex items-center gap-2 p-2 bg-[#2a2a3a]/50 hover:bg-[#262637] rounded-md transition-all duration-200 border border-transparent hover:border-green-500/30"
                >
                  <File className="w-4 h-4 text-green-300 flex-shrink-0" />
                  <span className="flex-1 text-left text-gray-200 text-xs truncate group-hover:text-white transition-colors">
                    {item.name}
                  </span>
                  <CheckCircle className="w-3 h-3 text-gray-400 group-hover:text-green-400 transition-colors flex-shrink-0" />
                </motion.button>
              ))}
              {repoFiles.filter(item => item.type === 'file').length === 0 && !isLoading && (
                <div className="text-xs text-gray-500 italic p-2">No files</div>
              )}
            </div>
          </div>
          
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e2e]/80">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Loading...</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
      </motion.div>
        )}
      </AnimatePresence>

      {/* GitHub Save Modal */}
      <AnimatePresence>
        {showGitHubSave && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            ref={saveModalRef}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div 
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.9 }} 
          className="bg-[#1e1e2e]/95 backdrop-blur-xl rounded-xl border border-[#313244] shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"

          >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Save to GitHub</h3>
                <button 
                  onClick={closeAllModals} 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Repository
                  </label>
                  <select 
                    value={selectedRepo} 
                    onChange={e => setSelectedRepo(e.target.value)} 
                    className="w-full p-2 bg-[#2a2a3a] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select repository</option>
                    {repos.map(r => (
                      <option key={r.id} value={r.full_name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    File Path
                  </label>
                  <input 
                    type="text" 
                    value={filePath} 
                    onChange={e => setFilePath(e.target.value)} 
                    placeholder={`main.${getFileExtension(language)}`} 
                    className="w-full p-2 bg-[#2a2a3a] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Commit Message
                  </label>
                  <input 
                    type="text" 
                    value={commitMessage} 
                    onChange={e => setCommitMessage(e.target.value)} 
                    placeholder="Update code from CoderCraft" 
                    className="w-full p-2 bg-[#2a2a3a] border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={closeAllModals} 
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveToGitHub} 
                    disabled={isLoading || !selectedRepo || !filePath || !commitMessage} 
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" /> 
                        Saving...
                      </div>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
