// "use client";

// import { useUser } from "@clerk/nextjs";
// import { useMutation } from "convex/react";
// import { motion } from "framer-motion";
// import { Loader2, Play } from "lucide-react";
// import { getExecutionResult, useCodeEditorStore } from "@/src/store/useCodeEditorStore";
// import { api } from "@/convex/_generated/api";

// function RunButton() {
//   const { user, isLoaded } = useUser();
//   const { runCode, language, isRunning } = useCodeEditorStore();
//   const saveExecution = useMutation(api.codeExecution.saveExecution);

//   const handleRun = async () => {
//     await runCode();
//     const result = getExecutionResult();
//     console.log(`execution code`, result?.code);

//     // Only try to save if user is authenticated and we have execution results
//     if (isLoaded && user && result?.code) {
//       try {
//         await saveExecution({
//           language,
//           code: result.code,
//           output: language.match(/react|jsx/) ? null : result.output ?? null,
//           error: result.error ?? null,
//         });
//         console.log("Execution saved successfully");
//       } catch (e) {
//         // Only log the error, don't break the execution flow
//         console.warn("SaveExecution failed (this won't affect code execution):", e);
//       }
//     } else if (!user && isLoaded) {
//       console.log("User not authenticated - skipping save to database");
//     }
//   };

//   return (
//     <motion.button
//       onClick={handleRun}
//       disabled={isRunning}
//       whileHover={{ scale: 1.02 }}
//       whileTap={{ scale: 0.98 }}
//       className={`
//         group relative inline-flex items-center gap-2.5 px-5 py-2.5
//         disabled:cursor-not-allowed
//         focus:outline-none
//       `}
//     >
//       {/* Background Gradient */}
//       <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl opacity-100 transition-opacity group-hover:opacity-90" />

//       <div className="relative flex items-center gap-2.5">
//         {isRunning ? (
//           <>
//             <div className="relative">
//               <Loader2 className="w-4 h-4 animate-spin text-white/70" />
//               <div className="absolute inset-0 blur animate-pulse" />
//             </div>
//             <span className="text-sm font-medium text-white/90">Executing...</span>
//           </>
//         ) : (
//           <>
//             <div className="relative flex items-center justify-center w-4 h-4">
//               <Play className="w-4 h-4 text-white/90 transition-transform group-hover:scale-110 group-hover:text-white" />
//             </div>
//             <span className="text-sm font-medium text-white/90 group-hover:text-white">
//               Run Code
//             </span>
//           </>
//         )}
//       </div>
//     </motion.button>
//   );
// }

// export default RunButton;

"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import { Loader2, Play } from "lucide-react";
import { getExecutionResult, useCodeEditorStore } from "@/src/store/useCodeEditorStore";
import { api } from "@/convex/_generated/api";

interface RunButtonProps {
  onExecutionChange?: (output: string, error: string | null, isRunning: boolean) => void;
  isCollaborating?: boolean;
  roomId?: string | null;
}

function RunButton({ onExecutionChange, isCollaborating = false, roomId }: RunButtonProps) {
  const { user, isLoaded } = useUser();
  const { runCode, language, isRunning } = useCodeEditorStore();
  const saveExecution = useMutation(api.codeExecution.saveExecution);

  const handleRun = async () => {
    console.log("🚀 Running code...", { isCollaborating, roomId });
    
    // Set running state and notify collaborators immediately
    if (isCollaborating && onExecutionChange) {
      console.log("📤 Notifying collaborators that execution started");
      onExecutionChange("", null, true);
    }

    try {
      await runCode();
      const result = getExecutionResult();
      console.log(`✅ Execution completed:`, {
        code: result?.code ? result.code.substring(0, 50) + "..." : "No code",
        output: result?.output ? result.output.substring(0, 50) + "..." : "No output",
        error: result?.error || "No error"
      });

      // Send execution results to collaborators
      if (isCollaborating && onExecutionChange && roomId) {
        console.log("📤 Sending execution results to collaborators");
        onExecutionChange(
          result?.output || "",
          result?.error || null,
          false
        );
      }

      // Only try to save if user is authenticated and we have execution results
      if (isLoaded && user && result?.code) {
        try {
          await saveExecution({
            language,
            code: result.code,
            output: language.match(/react|jsx/) ? null : result.output ?? null,
            error: result.error ?? null,
          });
          console.log("💾 Execution saved successfully to database");
        } catch (e) {
          // Only log the error, don't break the execution flow
          console.warn("❌ SaveExecution failed (this won't affect code execution):", e);
        }
      } else if (!user && isLoaded) {
        console.log("👤 User not authenticated - skipping save to database");
      }
    } catch (error) {
      console.error("❌ Execution failed:", error);
      
      // Notify collaborators about the error
      if (isCollaborating && onExecutionChange && roomId) {
        console.log("📤 Sending execution error to collaborators");
        onExecutionChange(
          "",
          error instanceof Error ? error.message : "Execution failed",
          false
        );
      }
    }
  };

  return (
    <motion.button
      onClick={handleRun}
      disabled={isRunning}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        group relative inline-flex items-center gap-2.5 px-5 py-2.5
        disabled:cursor-not-allowed
        focus:outline-none
      `}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl opacity-100 transition-opacity group-hover:opacity-90" />

      <div className="relative flex items-center gap-2.5">
        {isRunning ? (
          <>
            <div className="relative">
              <Loader2 className="w-4 h-4 animate-spin text-white/70" />
              <div className="absolute inset-0 blur animate-pulse" />
            </div>
            <span className="text-sm font-medium text-white/90">
              {isCollaborating ? "Executing (Shared)..." : "Executing..."}
            </span>
          </>
        ) : (
          <>
            <div className="relative flex items-center justify-center w-4 h-4">
              <Play className="w-4 h-4 text-white/90 transition-transform group-hover:scale-110 group-hover:text-white" />
            </div>
            <span className="text-sm font-medium text-white/90 group-hover:text-white">
              {isCollaborating ? "Run Code (Shared)" : "Run Code"}
            </span>
          </>
        )}
      </div>
    </motion.button>
  );
}

export default RunButton;