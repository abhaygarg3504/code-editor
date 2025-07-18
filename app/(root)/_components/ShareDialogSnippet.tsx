import { api } from "@/convex/_generated/api";
import { useCodeEditorStore } from "@/src/store/useCodeEditorStore"
import { useMutation } from "convex/react";
import { X, Lock, Globe, Info } from "lucide-react";
import { useState } from "react"
import toast from "react-hot-toast";

export default function ShareDialogSnippet({onClose}: {onClose: () => void}) {
  const [title, setTitle] = useState("")
  const [sharing, setSharing] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const {language, getCode} = useCodeEditorStore();
  const createSnippet = useMutation(api.snippet.createSnippet)

  const handleShare = async(e: React.FormEvent) => {
    e.preventDefault()
    setSharing(true)
    try {
        const code = getCode();
        await createSnippet({title, language, code, isPrivate})
        onClose();
        setTitle("")
        setIsPrivate(false)
        toast.success(
          isPrivate 
            ? "Private snippet created successfully!" 
            : "Snippet shared successfully!"
        )
    } catch(err) {
        console.log(`Error in share snippet is ${err}`)
        toast.error(`Error: ${err}`)
    } finally {
        setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#1e1e2e] rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">
                  {isPrivate ? "Create Private Snippet" : "Share Snippet"}
                </h2>
                <button 
                  onClick={onClose} 
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />    
                </button>
            </div>
            
            <form onSubmit={handleShare}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181825] border border-[#313244] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter snippet title"
                  required
                />
              </div>

              {/* Privacy Toggle with Visual Feedback */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-400">
                    Visibility
                  </label>
                  <div className="flex items-center space-x-2">
                    {isPrivate ? (
                      <Lock className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Globe className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm text-white">
                      {isPrivate ? "Private" : "Public"}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-[#181825] border border-[#313244] rounded-lg">
                  <input
                    type="checkbox"
                    id="privacy-toggle"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-[#181825] border-[#313244] rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="privacy-toggle" className="text-sm text-gray-300 cursor-pointer">
                    Make this snippet private
                  </label>
                </div>
                
                <div className="flex items-start space-x-2 mt-2 p-2 bg-[#181825] rounded-lg">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-400">
                    {isPrivate 
                      ? "Only you will be able to see this snippet. It won't appear in public listings."
                      : "This snippet will be visible to everyone and appear in public listings."
                    }
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sharing}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    isPrivate 
                      ? "bg-orange-500 hover:bg-orange-600 text-white" 
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {sharing ? (
                    <span className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-2">
                      {isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      <span>{isPrivate ? "Create Private" : "Share Public"}</span>
                    </span>
                  )}
                </button>
              </div>
            </form>
        </div>
    </div>
  )
}