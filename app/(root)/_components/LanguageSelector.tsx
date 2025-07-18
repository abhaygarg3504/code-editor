import { useCodeEditorStore } from "@/src/store/useCodeEditorStore";
import { useEffect, useRef, useState } from "react";
import { LANGUAGE_CONFIG } from "../_constants";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon, Lock, Sparkles } from "lucide-react";

interface LanguageSelectorProps {
  hasAccess: boolean;
}

function LanguageSelector({ hasAccess }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { language, setLanguage } = useCodeEditorStore();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLanguageObj = LANGUAGE_CONFIG[language];

  // Debug log to check the hasAccess value
  useEffect(() => {
    console.log("LanguageSelector received hasAccess:", hasAccess, typeof hasAccess);
  }, [hasAccess]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Define free languages that non-pro users can access
  const freeLanguages = ["javascript", "react", "jsx", "cpp", "python", "java"];

  // Helper function to determine if a language is locked
  const isLanguageLocked = (langId: string) => {
    const isLocked = !hasAccess && !freeLanguages.includes(langId);
    console.log(`Language ${langId}: hasAccess=${hasAccess}, freeLanguages.includes=${freeLanguages.includes(langId)}, isLocked=${isLocked}`);
    return isLocked;
  };

  const handleLanguageSelect = (langId: string) => {
    // Use the same logic as isLanguageLocked
    const isLocked = isLanguageLocked(langId);
    
    console.log(`Attempting to select language ${langId}: hasAccess=${hasAccess}, isLocked=${isLocked}`);
    
    if (isLocked) {
      console.log(`Access denied for language: ${langId} - User needs Pro access`);
      return;
    }

    console.log(`Language ${langId} selected successfully`);
    setLanguage(langId);
    setIsOpen(false);
  };

  // Check if current language is locked (shouldn't happen, but safety check)
  const currentLanguageLocked = isLanguageLocked(language);

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center gap-3 px-4 py-2.5 bg-[#1e1e2e]/80 
          rounded-lg transition-all 
          duration-200 border border-gray-800/50 hover:border-gray-700
          ${currentLanguageLocked ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/5 
        rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />
        <div className="size-6 rounded-md bg-gray-800/50 p-0.5 group-hover:scale-110 transition-transform">
          <img
            src={currentLanguageObj.logoPath}
            alt="programming language logo"
            width={24}
            height={24}
            className="w-full h-full object-contain relative z-10"
          />
        </div>

        <span className="text-gray-200 min-w-[80px] text-left group-hover:text-white transition-colors">
          {currentLanguageObj.label}
        </span>

        {/* Show pro indicator if user has access */}
        {hasAccess && (
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">PRO</span>
          </div>
        )}

        <ChevronDownIcon
          className={`size-4 text-gray-400 transition-all duration-300 group-hover:text-gray-300
            ${isOpen ? "rotate-180" : ""}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-64 bg-[#1e1e2e]/95 backdrop-blur-xl
           rounded-xl border border-[#313244] shadow-2xl py-2 z-[999]"
          >
            <div className="px-3 pb-2 mb-2 border-b border-gray-800/50">
              <p className="text-xs font-medium text-gray-400">
                Select Language
                {hasAccess && (
                  <span className="ml-2 text-amber-400">• PRO ACCESS</span>
                )}
              </p>
            </div>

            <div className="max-h-[300px] overflow-y-auto ">
              {Object.values(LANGUAGE_CONFIG).map((lang, index) => {
                const isLocked = isLanguageLocked(lang.id);
                const isFree = freeLanguages.includes(lang.id);

                return (
                  <motion.div
                    key={lang.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group px-2"
                  >
                    <button
                      className={`
                      relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                      ${language === lang.id ? "bg-blue-500/10 text-blue-400" : "text-gray-300"}
                      ${isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-[#262637] hover:text-white"}
                    `}
                      onClick={() => handleLanguageSelect(lang.id)}
                      disabled={isLocked}
                      title={isLocked ? "Upgrade to Pro to unlock this language" : `Switch to ${lang.label}`}
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg 
                      opacity-0 ${!isLocked ? "group-hover:opacity-100" : ""} transition-opacity`}
                      />

                      <div
                        className={`
                         relative size-8 rounded-lg p-1.5 transition-transform
                         ${!isLocked ? "group-hover:scale-110" : ""}
                         ${language === lang.id ? "bg-blue-500/10" : "bg-gray-800/50"}
                       `}
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg 
                        opacity-0 ${!isLocked ? "group-hover:opacity-100" : ""} transition-opacity`}
                        />
                        <img
                          width={24}
                          height={24}
                          src={lang.logoPath}
                          alt={`${lang.label} logo`}
                          className="w-full h-full object-contain relative z-10"
                        />
                      </div>

                      <span className={`flex-1 text-left transition-colors ${!isLocked ? "group-hover:text-white" : ""}`}>
                        {lang.label}
                      </span>

                      {/* Language status indicators */}
                      <div className="flex items-center gap-2">
                        {language === lang.id && !isLocked && (
                          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                        )}
                        
                        {isLocked && (
                          <div className="flex items-center gap-1">
                            <Lock className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500">PRO</span>
                          </div>
                        )}

                        {/* Show FREE badge for free languages when user is not pro */}
                        {!hasAccess && isFree && (
                          <span className="text-xs text-green-400 opacity-60">FREE</span>
                        )}

                        {/* Show PRO badge for paid languages when user has access */}
                        {hasAccess && !isFree && (
                          <span className="text-xs text-amber-400 opacity-60">PRO</span>
                        )}
                      </div>

                      {/* Selection border */}
                      {language === lang.id && (
                        <motion.div
                          className="absolute inset-0 border-2 border-blue-500/30 rounded-lg"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: "spring",
                            bounce: 0.2,
                            duration: 0.6,
                          }}
                        />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer message for non-pro users */}
            {!hasAccess && (
              <div className="px-3 pt-2 mt-2 border-t border-gray-800/50">
                <p className="text-xs text-gray-500 text-center">
                  <Lock className="w-3 h-3 inline mr-1" />
                  Upgrade to Pro to unlock all languages
                </p>
                <p className="text-xs text-green-400/60 text-center mt-1">
                  Free: JavaScript, React, JSX
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LanguageSelector;
