import * as monacoEditor from "monaco-editor"
import { CodeEditorState } from "../types"
import { create } from "zustand"
import { LANGUAGE_CONFIG } from "@/app/(root)/_constants"

// Test Case interfaces
interface TestCase {
  id: number;
  name: string;
  input: string;
  expectedOutput: string;
  enabled: boolean;
}

interface TestResult {
  testCase: TestCase;
  output: string;
  error: string | null;
  passed: boolean;
  executionTime?: number;
}

// Extended interface for test cases
interface TestCaseState {
  testCases: TestCase[];
  testResults: TestResult[];
  isRunningTests: boolean;
  setTestCases: (testCases: TestCase[]) => void;
  addTestCase: (testCase?: Partial<TestCase>) => void;
  removeTestCase: (id: number) => void;
  updateTestCase: (id: number, field: keyof TestCase, value: any) => void;
  runTests: () => Promise<void>;
  setTestResults: (results: TestResult[]) => void;
  clearTestResults: () => void;
  getTestCaseTemplate: (language: string) => { input: string; expectedOutput: string };
}

// Enhanced CodeEditorState with test functionality
interface EnhancedCodeEditorState extends CodeEditorState, TestCaseState {}

const getInitialState = () => {
  if (typeof window === "undefined") {
    return {
      language: "javascript",
      fontSize: 16,
      theme: "vs-dark",
      code: "",
      testCases: [],
    }
  }

  const savedLanguage = localStorage.getItem("editor-language") || "javascript"
  const savedTheme = localStorage.getItem("editor-theme") || "vs-dark"
  const savedFontSize = parseInt(localStorage.getItem("editor-font-size") || "16", 10)
  const savedTestCases = JSON.parse(localStorage.getItem(`editor-test-cases-${savedLanguage}`) || "[]")

  return {
    language: savedLanguage,
    theme: savedTheme,
    fontSize: savedFontSize,
    code: "",
    testCases: savedTestCases,
  }
}

// Helper function to detect if code reads from stdin
const detectsStdinInput = (code: string, language: string): boolean => {
  switch (language) {
    case 'cpp':
    case 'c':
      return code.includes('cin') || code.includes('scanf') || code.includes('getchar');
    case 'java':
      return code.includes('Scanner') || code.includes('System.in') || code.includes('BufferedReader');
    case 'python':
      return code.includes('input(') || code.includes('sys.stdin') || code.includes('raw_input(');
    case 'javascript':
    case 'typescript':
      return code.includes('readline') || code.includes('process.stdin');
    case 'csharp':
      return code.includes('Console.ReadLine') || code.includes('Console.Read');
    case 'go':
      return code.includes('fmt.Scan') || code.includes('bufio.Scanner');
    case 'rust':
      return code.includes('stdin()') || code.includes('read_line');
    case 'ruby':
      return code.includes('gets') || code.includes('STDIN');
    case 'swift':
      return code.includes('readLine()');
    default:
      return false;
  }
};

// Helper function to parse test input format
const parseTestInput = (input: string) => {
  // Remove comments and clean up
  const cleanInput = input
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/#.*$/gm, '') // Remove Python/shell comments
    .trim();

  // Try to detect if it's stdin data vs function call
  const functionCallPattern = /\w+\s*\([^)]*\)/;
  const hasFunction = functionCallPattern.test(cleanInput);
  
  if (hasFunction) {
    return {
      isStdinData: false,
      stdinData: '',
      functionCall: cleanInput
    };
  }

  // Treat as stdin data
  return {
    isStdinData: true,
    stdinData: cleanInput,
    functionCall: ''
  };
};

// Enhanced function to generate test code that works for any language
const generateTestCode = (mainCode: string, testCase: TestCase, language: string): string => {
  const inputInfo = parseTestInput(testCase.input);
  const needsStdin = detectsStdinInput(mainCode, language);
  
  // If code reads from stdin, we don't need to modify it - just provide stdin data
  if (needsStdin && inputInfo.isStdinData) {
    return mainCode;
  }

  switch (language) {
    case 'javascript':
    case 'typescript':
      if (inputInfo.functionCall) {
        return `
${mainCode}

// Test Case: ${testCase.name}
try {
  const result = ${inputInfo.functionCall};
  console.log(result);
} catch (error) {
  console.error('Error:', error.message);
}`;
      } else {
        // For stdin-based input in Node.js
        return `
${mainCode}

// Test Case: ${testCase.name}
// Input data will be provided via stdin
`;
      }

    case 'python':
      if (inputInfo.functionCall) {
        return `
${mainCode}

# Test Case: ${testCase.name}
try:
    result = ${inputInfo.functionCall}
    print(result)
except Exception as e:
    print(f"Error: {e}")`;
      } else {
        // For stdin-based input
        return `
${mainCode}

# Test Case: ${testCase.name}
# Input data will be provided via stdin
`;
      }

    case 'java':
      const hasMainMethod = mainCode.includes('public static void main');
      const hasPublicClass = mainCode.includes('public class');
      
      if (hasMainMethod) {
        // Code already has main method, just add test case comment
        return `
${mainCode}

/*
Test Case: ${testCase.name}
Input: ${testCase.input}
Expected Output: ${testCase.expectedOutput}
*/`;
      } else if (inputInfo.functionCall) {
        // Wrap function call in main method
        const className = hasPublicClass ? 'Main' : 'TestRunner';
        return `
${mainCode}

public class ${className} {
    public static void main(String[] args) {
        try {
            // Test Case: ${testCase.name}
            System.out.println(${inputInfo.functionCall});
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}`;
      } else {
        // Default main method wrapper
        return `
${mainCode}

/*
Test Case: ${testCase.name}
Input data will be provided via stdin
*/`;
      }

    case 'cpp':
      const hasMainFunction = mainCode.includes('int main') || mainCode.includes('void main');
      
      if (hasMainFunction) {
        // Code already has main function
        return `
${mainCode}

/*
Test Case: ${testCase.name}
Input: ${testCase.input}
Expected Output: ${testCase.expectedOutput}
*/`;
      } else if (inputInfo.functionCall) {
        // Wrap function call in main
        return `
#include <iostream>
#include <vector>
#include <string>
using namespace std;

${mainCode}

int main() {
    try {
        // Test Case: ${testCase.name}
        cout << ${inputInfo.functionCall} << endl;
    } catch (const exception& e) {
        cerr << "Error: " << e.what() << endl;
    }
    return 0;
}`;
      } else {
        // Default main function
        return `
${mainCode}

/*
Test Case: ${testCase.name}
Input data will be provided via stdin
*/`;
      }

    case 'c':
      const hasMainFunctionC = mainCode.includes('int main') || mainCode.includes('void main');
      
      if (hasMainFunctionC) {
        return `
${mainCode}

/*
Test Case: ${testCase.name}
Input: ${testCase.input}
Expected Output: ${testCase.expectedOutput}
*/`;
      } else {
        return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

${mainCode}

int main() {
    // Test Case: ${testCase.name}
    // Input data will be provided via stdin
    return 0;
}`;
      }

    case 'csharp':
      const hasMainMethodCS = mainCode.includes('static void Main') || mainCode.includes('static async Task Main');
      
      if (hasMainMethodCS) {
        return `
${mainCode}

/*
Test Case: ${testCase.name}
Input: ${testCase.input}
Expected Output: ${testCase.expectedOutput}
*/`;
      } else if (inputInfo.functionCall) {
        return `
using System;

${mainCode}

public class TestRunner {
    public static void Main(string[] args) {
        try {
            // Test Case: ${testCase.name}
            Console.WriteLine(${inputInfo.functionCall});
        } catch (Exception e) {
            Console.WriteLine($"Error: {e.Message}");
        }
    }
}`;
      } else {
        return `
using System;

${mainCode}

/*
Test Case: ${testCase.name}
Input data will be provided via stdin
*/`;
      }

    case 'go':
      const hasMainFunctionGo = mainCode.includes('func main()');
      
      if (hasMainFunctionGo) {
        return `
${mainCode}

/*
Test Case: ${testCase.name}
Input: ${testCase.input}
Expected Output: ${testCase.expectedOutput}
*/`;
      } else if (inputInfo.functionCall) {
        return `
package main

import "fmt"

${mainCode}

func main() {
    // Test Case: ${testCase.name}
    fmt.Println(${inputInfo.functionCall})
}`;
      } else {
        return `
package main

import "fmt"

${mainCode}

/*
Test Case: ${testCase.name}
Input data will be provided via stdin
*/`;
      }

    case 'rust':
      const hasMainFunctionRust = mainCode.includes('fn main()');
      
      if (hasMainFunctionRust) {
        return `
${mainCode}

/*
Test Case: ${testCase.name}
Input: ${testCase.input}
Expected Output: ${testCase.expectedOutput}
*/`;
      } else if (inputInfo.functionCall) {
        return `
${mainCode}

fn main() {
    // Test Case: ${testCase.name}
    println!("{}", ${inputInfo.functionCall});
}`;
      } else {
        return `
${mainCode}

/*
Test Case: ${testCase.name}
Input data will be provided via stdin
*/`;
      }

    case 'swift':
      if (inputInfo.functionCall) {
        return `
${mainCode}

// Test Case: ${testCase.name}
do {
    print(${inputInfo.functionCall})
} catch {
    print("Error: \\(error)")
}`;
      } else {
        return `
${mainCode}

// Test Case: ${testCase.name}
// Input data will be provided via stdin
`;
      }

    case 'ruby':
      if (inputInfo.functionCall) {
        return `
${mainCode}

# Test Case: ${testCase.name}
begin
    puts ${inputInfo.functionCall}
rescue => e
    puts "Error: #{e.message}"
end`;
      } else {
        return `
${mainCode}

# Test Case: ${testCase.name}
# Input data will be provided via stdin
`;
      }

    case 'kotlin':
      const hasMainFunctionKt = mainCode.includes('fun main(');
      
      if (hasMainFunctionKt) {
        return `
${mainCode}

/*
Test Case: ${testCase.name}
Input: ${testCase.input}
Expected Output: ${testCase.expectedOutput}
*/`;
      } else if (inputInfo.functionCall) {
        return `
${mainCode}

fun main() {
    try {
        // Test Case: ${testCase.name}
        println(${inputInfo.functionCall})
    } catch (e: Exception) {
        println("Error: \${e.message}")
    }
}`;
      } else {
        return `
${mainCode}

/*
Test Case: ${testCase.name}
Input data will be provided via stdin
*/`;
      }

    default:
      return `
${mainCode}

# Test Case: ${testCase.name}
# Input: ${testCase.input}
# Expected Output: ${testCase.expectedOutput}
`;
  }
}

// Enhanced test case templates for different languages
const getTestCaseTemplate = (language: string) => {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return {
        input: "// For function calls:\n// functionName(args)\n// For stdin input:\n// 5\n// 1 2 3 4 5",
        expectedOutput: "15"
      };
    case 'python':
      return {
        input: "# For function calls:\n# function_name(args)\n# For stdin input:\n# 5\n# 1 2 3 4 5",
        expectedOutput: "15"
      };
    case 'java':
      return {
        input: "// For stdin input (Scanner):\n5\n1 2 3 4 5",
        expectedOutput: "15"
      };
    case 'cpp':
    case 'c':
      return {
        input: "// For stdin input (cin/scanf):\n5\n1 2 3 4 5",
        expectedOutput: "15"
      };
    case 'csharp':
      return {
        input: "// For stdin input (Console.ReadLine):\n5\n1 2 3 4 5",
        expectedOutput: "15"
      };
    case 'go':
      return {
        input: "// For stdin input (fmt.Scan):\n5\n1 2 3 4 5",
        expectedOutput: "15"
      };
    case 'rust':
      return {
        input: "// For stdin input (stdin()):\n5\n1 2 3 4 5",
        expectedOutput: "15"
      };
    case 'swift':
      return {
        input: "// For stdin input (readLine()):\n5\n1 2 3 4 5",
        expectedOutput: "15"
      };
    case 'ruby':
      return {
        input: "# For stdin input (gets):\n5\n1 2 3 4 5",
        expectedOutput: "15"
      };
    case 'kotlin':
      return {
        input: "// For stdin input (readLine()):\n5\n1 2 3 4 5",
        expectedOutput: "15"
      };
    default:
      return {
        input: "// Test input here\n5\n1 2 3 4 5",
        expectedOutput: "15"
      };
  }
};

// Enhanced output comparison with better normalization
const compareOutputs = (actual: string, expected: string): boolean => {
  // Normalize whitespace and line endings
  const normalizeOutput = (str: string) => {
    return str
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s+$/gm, '') // Remove trailing whitespace from each line
      .replace(/^\s+/gm, '') // Remove leading whitespace from each line
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .toLowerCase(); // Case insensitive comparison
  };
  
  const normalizedActual = normalizeOutput(actual);
  const normalizedExpected = normalizeOutput(expected);
  
  // Try exact match first
  if (normalizedActual === normalizedExpected) {
    return true;
  }
  
  // Try numeric comparison if both are numbers
  const actualNum = parseFloat(normalizedActual);
  const expectedNum = parseFloat(normalizedExpected);
  if (!isNaN(actualNum) && !isNaN(expectedNum)) {
    return Math.abs(actualNum - expectedNum) < 0.0001; // Allow small floating point differences
  }
  
  // Try to match just the numbers/meaningful content
  const extractNumbers = (str: string) => {
    const matches = str.match(/\d+\.?\d*/g);
    return matches ? matches.join(' ') : str;
  };
  
  const actualNumbers = extractNumbers(normalizedActual);
  const expectedNumbers = extractNumbers(normalizedExpected);
  
  return actualNumbers === expectedNumbers;
};

export const useCodeEditorStore = create<EnhancedCodeEditorState>((set, get) => {
  const initialState = getInitialState()

  return {
    ...initialState,
    output: "",
    isRunning: false,
    error: null,
    editor: null,
    executionResult: null,
    // Collaboration state
    isCollaborating: false,
    collaborators: [],
    // Test case state
    testResults: [],
    isRunningTests: false,

    getCode: () => get().editor?.getValue() || "",

    setEditor: (editor: monacoEditor.editor.IStandaloneCodeEditor) => {
      const savedCode = localStorage.getItem(`editor-code-${get().language}`)
      if (savedCode && !get().isCollaborating) {
        editor.setValue(savedCode)
      }
      set({ editor })
    },

    setCode: (code: string, fromCollab = false) => {
      const { editor, isCollaborating } = get();
      if (editor && code !== editor.getValue()) {
        const position = editor.getPosition();
        editor.setValue(code);
        if (position) {
          editor.setPosition(position);
        }
        
        if (!fromCollab && !isCollaborating) {
          localStorage.setItem(`editor-code-${get().language}`, code);
        }
      }
    },

    setTheme: (theme: string) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("editor-theme", theme)
      }
      set({ theme })
    },

    setFontSize: (fontSize: number) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("editor-font-size", fontSize.toString())
      }
      set({ fontSize })
    },

    setLanguage: (language: string) => {
      const currentCode = get().editor?.getValue()
      const currentLanguage = get().language
      
      // Save current code and test cases before switching languages
      if (currentCode && !get().isCollaborating && typeof window !== "undefined") {
        localStorage.setItem(`editor-code-${currentLanguage}`, currentCode)
      }
      
      // Save current test cases
      if (typeof window !== "undefined") {
        localStorage.setItem(`editor-test-cases-${currentLanguage}`, JSON.stringify(get().testCases))
      }

      // Load test cases for new language
      const savedTestCases = typeof window !== "undefined" 
        ? JSON.parse(localStorage.getItem(`editor-test-cases-${language}`) || "[]")
        : []

      if (typeof window !== "undefined") {
        localStorage.setItem("editor-language", language)
      }

      set({
        language,
        output: "",
        error: null,
        testCases: savedTestCases,
        testResults: [],
      })
    },

    setCollaborating: (isCollaborating: boolean) => {
      set({ isCollaborating });
    },

    setCollaborators: (collaborators: string[]) => {
      set({ collaborators });
    },

    getTestCaseTemplate: (language: string) => getTestCaseTemplate(language),

    setTestCases: (testCases: TestCase[]) => {
      set({ testCases });
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(`editor-test-cases-${get().language}`, JSON.stringify(testCases));
      }
    },

    addTestCase: (testCase?: Partial<TestCase>) => {
      const { testCases, language } = get();
      const template = getTestCaseTemplate(language);
      
      const newTestCase: TestCase = {
        id: Date.now(),
        name: testCase?.name || `Test Case ${testCases.length + 1}`,
        input: testCase?.input || template.input,
        expectedOutput: testCase?.expectedOutput || template.expectedOutput,
        enabled: testCase?.enabled ?? true,
      };

      const updatedTestCases = [...testCases, newTestCase];
      set({ testCases: updatedTestCases });
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(`editor-test-cases-${language}`, JSON.stringify(updatedTestCases));
      }
    },

    removeTestCase: (id: number) => {
      const { testCases, language } = get();
      const updatedTestCases = testCases.filter(tc => tc.id !== id);
      set({ testCases: updatedTestCases });
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(`editor-test-cases-${language}`, JSON.stringify(updatedTestCases));
      }
    },

    updateTestCase: (id: number, field: keyof TestCase, value: any) => {
      const { testCases, language } = get();
      const updatedTestCases = testCases.map(tc => 
        tc.id === id ? { ...tc, [field]: value } : tc
      );
      set({ testCases: updatedTestCases });
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(`editor-test-cases-${language}`, JSON.stringify(updatedTestCases));
      }
    },

    setTestResults: (results: TestResult[]) => {
      set({ testResults: results });
    },

    clearTestResults: () => {
      set({ testResults: [] });
    },

    runTests: async () => {
      const { testCases, language, getCode } = get();
      const enabledTestCases = testCases.filter(tc => tc.enabled);
      
      if (enabledTestCases.length === 0) {
        set({ testResults: [] });
        return;
      }

      const mainCode = getCode();
      if (!mainCode.trim()) {
        set({ 
          testResults: enabledTestCases.map(testCase => ({
            testCase,
            output: "",
            error: "No code to test",
            passed: false
          }))
        });
        return;
      }

      set({ isRunningTests: true, testResults: [] });

      const results: TestResult[] = [];
      const languageConfig = LANGUAGE_CONFIG[language];
      
      if (!languageConfig || !languageConfig.pistonRuntime) {
        set({
          testResults: enabledTestCases.map(testCase => ({
            testCase,
            output: "",
            error: `Language "${language}" is not supported for execution.`,
            passed: false
          })),
          isRunningTests: false
        });
        return;
      }

      const runtime = languageConfig.pistonRuntime;

      for (const testCase of enabledTestCases) {
        const startTime = Date.now();
        
        try {
          const testCode = generateTestCode(mainCode, testCase, language);
          const inputInfo = parseTestInput(testCase.input);
          
          // Determine stdin data
          let stdin = "";
          if (inputInfo.isStdinData) {
            stdin = inputInfo.stdinData;
          } else if (detectsStdinInput(mainCode, language)) {
            // If code expects stdin but we have function call, try to convert
            stdin = testCase.input.replace(/\/\/.*$/gm, '').replace(/#.*$/gm, '').trim();
          }
          
          const response = await fetch("https://emkc.org/api/v2/piston/execute", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              language: runtime.language,
              version: runtime.version,
              files: [{ content: testCode }],
              stdin: stdin,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          const executionTime = Date.now() - startTime;

          let output = "";
          let error = null;

          // Handle API errors
          if (data.message) {
            error = data.message;
          }
          // Handle compile error
          else if (data.compile && data.compile.code !== 0) {
            error = data.compile.stderr || data.compile.output || "Compilation failed";
          }
          // Handle runtime error
          else if (data.run && data.run.code !== 0) {
            error = data.run.stderr || data.run.output || "Runtime error occurred";
          }
          // Success case
          else {
            output = data.run?.output || "";
          }

          const actualOutput = output.trim();
          const expectedOutput = testCase.expectedOutput.trim();
          const passed = !error && compareOutputs(actualOutput, expectedOutput);

          results.push({
            testCase,
            output: actualOutput,
            error,
            passed,
            executionTime
          });

        } catch (err) {
          const executionTime = Date.now() - startTime;
          results.push({
            testCase,
            output: "",
            error: err instanceof Error ? err.message : "Unknown error occurred",
            passed: false,
            executionTime
          });
        }
      }

      set({ testResults: results, isRunningTests: false });
    },

    // Updated runCode method
    runCode: async () => {
      const { language, getCode } = get();
      const code = getCode();

      if (!code.trim()) {
        set({ error: "Please write some code" });
        return;
      }

      set({ isRunning: true, error: null, output: "" });

      try {
        // Handle React/JSX code
        if (language === 'react' || language === 'jsx') {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set({
            output: "__REACT_PREVIEW__",
            executionResult: { 
              code, 
              output: "__REACT_PREVIEW__", 
              error: null 
            },
            isRunning: false,
          });
          return;
        }

        // Check if language configuration exists
        const languageConfig = LANGUAGE_CONFIG[language];
        if (!languageConfig || !languageConfig.pistonRuntime) {
          set({
            error: `Language "${language}" is not supported for execution.`,
            isRunning: false,
          });
          return;
        }

        const runtime = languageConfig.pistonRuntime;

        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            language: runtime.language,
            version: runtime.version,
            files: [{ content: code }],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Handle API errors
        if (data.message) {
          set({
            error: data.message,
            executionResult: { code, output: "", error: data.message },
            isRunning: false,
          });
          return;
        }

        // Handle compile error
        if (data.compile && data.compile.code !== 0) {
          const error = data.compile.stderr || data.compile.output || "Compilation failed";
          set({
            error,
            executionResult: { code, output: "", error },
            isRunning: false,
          });
          return;
        }

        // Handle runtime error
        if (data.run && data.run.code !== 0) {
          const error = data.run.stderr || data.run.output || "Runtime error occurred";
          set({
            error,
            executionResult: { code, output: "", error },
            isRunning: false,
          });
          return;
        }

        // Success case
        const output = data.run?.output || "";
        set({
          output: output.trim(),
          executionResult: { code, output: output.trim(), error: null },
          isRunning: false,
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Something went wrong while executing code.";
        set({
          error: errorMessage,
          executionResult: { code, output: "", error: errorMessage },
          isRunning: false,
        });
        console.error("Error in running code:", err);
      }
    },
  };
});

export const getExecutionResult = () => useCodeEditorStore.getState().executionResult;