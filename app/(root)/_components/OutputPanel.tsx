"use client";
import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Copy, 
  Terminal, 
  Users, 
  Play, 
  TestTube, 
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Timer
} from "lucide-react";
import { useCodeEditorStore } from "@/src/store/useCodeEditorStore";
import useMounted from "@/src/hooks/useMounted";
import ReactJsxPreview from "./ReactJsxPreview";
import RunningCodeSkeleton from "./RunningCodeSkeleton";
import { TestCase, TestResult } from "@/src/types";

interface OutputPanelProps {
  roomId?: string | null;
  onOutputChange?: (output: string, error: string | null, isRunning: boolean) => void;
  collaborativeOutput?: string;
  collaborativeError?: string | null;
  isCollaborativeRunning?: boolean;
  isCollaborating?: boolean;
  onRunCode?: () => void;
  sendRunCode?: (language: string) => void;
  isExecuting?: boolean;
}

const TestCasePanel = ({ 
  testCases, 
  addTestCase,
  removeTestCase,
  updateTestCase,
  language, 
  isCollaborating,
  getTestCaseTemplate 
}: {
  testCases: TestCase[];
  addTestCase: (testCase?: Partial<TestCase>) => void;
  removeTestCase: (id: number) => void;
  updateTestCase: (id: number, field: keyof TestCase, value: any) => void;
  language: string;
  isCollaborating: boolean;
  getTestCaseTemplate: (language: string) => { input: string; expectedOutput: string };
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const addEmptyTestCase = () => {
    addTestCase();
  };

  const addTemplateTestCase = () => {
    const template = getTestCaseTemplate(language);
    addTestCase({
      name: `${language} Test Case ${testCases.length + 1}`,
      input: template.input,
      expectedOutput: template.expectedOutput,
      enabled: true
    });
  };

  return (
    <div className="mb-4 bg-[#1e1e2e]/50 rounded-xl border border-[#313244]">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#313244]/30 rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <TestTube className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-300">
            Test Cases ({testCases.filter(tc => tc.enabled).length})
          </span>
          {isCollaborating && (
            <span className="text-xs text-purple-400/60">(Shared)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              addTemplateTestCase();
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-purple-400 hover:text-purple-300 
            bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-all"
          >
            <Plus className="w-3 h-3" />
            Add Template
          </button>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-3 border-t border-[#313244]/50 space-y-3">
          {testCases.map((testCase) => (
            <div key={testCase.id} className="bg-[#181825] rounded-lg p-3 border border-[#313244]/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={testCase.enabled}
                    onChange={(e) => updateTestCase(testCase.id, 'enabled', e.target.checked)}
                    className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    value={testCase.name}
                    onChange={(e) => updateTestCase(testCase.id, 'name', e.target.value)}
                    className="bg-transparent text-sm text-gray-300 border-none outline-none 
                    focus:bg-[#313244]/30 px-1 py-0.5 rounded"
                  />
                </div>
                <button
                  onClick={() => removeTestCase(testCase.id)}
                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Input</label>
                  <textarea
                    value={testCase.input}
                    onChange={(e) => updateTestCase(testCase.id, 'input', e.target.value)}
                    placeholder="Test input or setup code..."
                    className="w-full h-16 bg-[#313244]/30 border border-[#313244]/50 rounded-lg p-2 
                    text-xs text-gray-300 font-mono resize-none focus:border-purple-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Expected Output</label>
                  <textarea
                    value={testCase.expectedOutput}
                    onChange={(e) => updateTestCase(testCase.id, 'expectedOutput', e.target.value)}
                    placeholder="Expected output..."
                    className="w-full h-16 bg-[#313244]/30 border border-[#313244]/50 rounded-lg p-2 
                    text-xs text-gray-300 font-mono resize-none focus:border-purple-500/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
          
          {testCases.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <TestTube className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No test cases yet. Add one to get started!</p>
            </div>
          )}
          
          <button
            onClick={addEmptyTestCase}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 
            hover:text-gray-300 border-2 border-dashed border-[#313244]/50 hover:border-[#313244] 
            rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Test Case
          </button>
        </div>
      )}
    </div>
  );
};

const TestResultComponent = ({ testCase, result }: { testCase: TestCase; result: TestResult }) => {
  const passed = result.passed;
  const actualOutput = result.output || "";
  const error = result.error;
  
  return (
    <div className={`p-3 rounded-lg border ${
      passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {passed ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm font-medium text-gray-300">{testCase.name}</span>
          <span className={`text-xs px-2 py-1 rounded ${
            passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {passed ? 'PASSED' : 'FAILED'}
          </span>
        </div>
        {result.executionTime && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {result.executionTime}ms
          </span>
        )}
      </div>
      
      {!passed && (
        <div className="space-y-2">
          {error && (
            <div>
              <label className="block text-xs text-red-400 mb-1">Error</label>
              <pre className="text-xs bg-red-500/10 p-2 rounded border border-red-500/30 text-red-300 overflow-x-auto">
                {error}
              </pre>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Expected Output</label>
              <pre className="text-xs bg-[#313244]/30 p-2 rounded border border-[#313244]/50 text-gray-300 overflow-x-auto">
                {testCase.expectedOutput}
              </pre>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Actual Output</label>
              <pre className="text-xs bg-[#313244]/30 p-2 rounded border border-[#313244]/50 text-gray-300 overflow-x-auto">
                {actualOutput}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OutputPanel: React.FC<OutputPanelProps> = ({
  roomId,
  onOutputChange,
  collaborativeOutput,
  collaborativeError,
  isCollaborativeRunning = false,
  isCollaborating = false,
  onRunCode,
  sendRunCode,
  isExecuting = false
}) => {
  const mounted = useMounted();
  const {
    getCode,
    output,
    error,
    isRunning,
    language,
    testCases,
    testResults,
    isRunningTests,
    addTestCase,
    removeTestCase,
    updateTestCase,
    runTests,
    runCode,
    getTestCaseTemplate
  } = useCodeEditorStore();

  const [activeTab, setActiveTab] = useState<'output' | 'tests'>('output');
  const [isCopied, setIsCopied] = useState(false);

  const code = getCode();

  // Use collaborative state when in a room, otherwise use local state
  const currentOutput = isCollaborating ? (collaborativeOutput ?? output) : output;
  const currentError = isCollaborating ? (collaborativeError ?? error) : error;
  const currentIsRunning = isCollaborating ? (isExecuting || isCollaborativeRunning) : isRunning;

  const hasContent = currentError || currentOutput;

  const handleCopy = async () => {
    if (!hasContent) return;
    await navigator.clipboard.writeText(currentError || currentOutput || "");
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRunCode = () => {
    if (isCollaborating && sendRunCode) {
      sendRunCode(language);
    } else if (onRunCode) {
      onRunCode();
    } else {
      runCode();
    }
  };

  const handleRunTests = () => {
    if (testCases.length > 0) {
      runTests();
    }
  };

  // Notify parent component about output changes
  useEffect(() => {
    if (onOutputChange) {
      onOutputChange(currentOutput || "", currentError, currentIsRunning);
    }
  }, [currentOutput, currentError, currentIsRunning, onOutputChange]);

  if (!mounted) return null;

  const enabledTestCases = testCases.filter(tc => tc.enabled);
  const passedTests = testResults.filter(result => result.passed).length;
  const totalTests = testResults.length;

  return (
    <div className="relative bg-[#181825] rounded-xl p-4 ring-1 ring-gray-800/50 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#1e1e2e] ring-1 ring-gray-800/50">
            <Terminal className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-sm font-medium text-gray-300">Output</span>
          {isCollaborating && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
              <Users className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400">Shared</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Selector */}
          <div className="flex bg-[#1e1e2e] rounded-lg p-1 ring-1 ring-gray-800/50">
            <button
              onClick={() => setActiveTab('output')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === 'output' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Console
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === 'tests' 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Tests {totalTests > 0 && `(${passedTests}/${totalTests})`}
            </button>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunCode}
            disabled={currentIsRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-green-600 hover:bg-green-700 
            disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
          >
            {currentIsRunning ? (
              <>
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                {isCollaborating ? "Running for All..." : "Running..."}
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                {isCollaborating ? "Run for All" : "Run"}
              </>
            )}
          </button>

          {/* Run Tests Button */}
          {activeTab === 'tests' && (
            <button
              onClick={handleRunTests}
              disabled={isRunningTests || enabledTestCases.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-purple-600 hover:bg-purple-700 
              disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
            >
              {isRunningTests ? (
                <>
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-3 h-3" />
                  Run Tests
                </>
              )}
            </button>
          )}

          {hasContent && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-300 bg-[#1e1e2e] 
              rounded-lg ring-1 ring-gray-800/50 hover:ring-gray-700/50 transition-all"
            >
              {isCopied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Collaboration Status */}
      {isCollaborating && roomId && (
        <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-blue-400 text-xs">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>
              Output is synchronized across all users in room: <code className="bg-blue-500/20 px-1 rounded">{roomId}</code>
            </span>
          </div>
        </div>
      )}

      {/* Output Area */}
      <div className="flex-1 relative">
        <div className="relative bg-[#1e1e2e]/50 backdrop-blur-sm border border-[#313244] rounded-xl p-4 h-full overflow-auto">
          {activeTab === 'output' ? (
            // Console Output Tab
            <>
              {currentIsRunning ? (
                <div className="space-y-2">
                  {isCollaborating && (
                    <div className="flex items-center gap-2 text-yellow-400 text-xs mb-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span>Code is running for all collaborators...</span>
                    </div>
                  )}
                  <RunningCodeSkeleton />
                </div>
              ) : currentError ? (
                <div className="flex items-start gap-3 text-red-400">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-1" />
                  <div className="space-y-1">
                    <div className="font-medium">
                      Execution Error
                      {isCollaborating && (
                        <span className="ml-2 text-xs text-red-400/60">(Shared with all users)</span>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap text-red-400/80">{currentError}</pre>
                  </div>
                </div>
              ) : currentOutput ? (
                (language === "react" || language === "jsx") && 
                (currentOutput === "REACT_PREVIEW" || currentOutput === "__REACT_PREVIEW__") ? (
                  <div className="h-full">
                    <ReactJsxPreview />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 mb-3">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">
                        Execution Successful
                        {isCollaborating && (
                          <span className="ml-2 text-xs text-emerald-400/60">(Shared with all users)</span>
                        )}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap text-gray-300 font-mono text-sm">{currentOutput}</pre>
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-800/50 ring-1 ring-gray-700/50 mb-4">
                    <Clock className="w-6 h-6" />
                  </div>
                  <p className="text-center">
                    {isCollaborating 
                      ? "Run code to see the output here. Results will be shared with all collaborators..." 
                      : "Run your code to see the output here..."
                    }
                  </p>
                </div>
              )}
            </>
          ) : (
            // Test Cases Tab
            <div className="h-full overflow-auto">
              <TestCasePanel
                testCases={testCases}
                addTestCase={addTestCase}
                removeTestCase={removeTestCase}
                updateTestCase={updateTestCase}
                language={language}
                isCollaborating={isCollaborating}
                getTestCaseTemplate={getTestCaseTemplate}
              />
              
              {testResults.length > 0 && (
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TestTube className="w-5 h-5 text-purple-400" />
                    <span className="text-lg font-semibold text-gray-200">Test Results</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      passedTests === totalTests 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {passedTests}/{totalTests} passed
                    </span>
                  </div>
                  
                  {testResults.map((result) => {
                    const testCase = testCases.find(tc => tc.id === result.testCase.id);
                    if (!testCase) return null;
                    
                    return (
                      <TestResultComponent
                        key={testCase.id}
                        testCase={testCase}
                        result={result}
                      />
                    );
                  })}
                </div>
              )}
              
              {testCases.length === 0 && (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <TestTube className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm mb-2">No test cases yet</p>
                    <p className="text-xs text-gray-600">Add test cases to validate your code</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutputPanel;