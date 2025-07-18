// import { Monaco } from "@monaco-editor/react";
import { Id } from "../../convex/_generated/dataModel";
import { Monaco, OnMount } from "@monaco-editor/react"
import * as monacoEditor from "monaco-editor" // 👈 Import the real editor types
import { editor } from "monaco-editor"
export interface Theme {
  id: string;
  label: string;
  color: string;
}

export interface TestCase {
  id: number;
  name: string;
  input: string;
  expectedOutput: string;
  enabled: boolean;
}

export interface TestResult {
  testCase: TestCase;
  output: string;
  error: string | null;
  passed: boolean;
  executionTime?: number;
}

export interface Language {
  id: string;
  label: string;
  logoPath: string;
  monacoLanguage: string;
  defaultCode: string;
  pistonRuntime: LanguageRuntime;
}

export interface LanguageRuntime {
  language: string;
  version: string;
}

export interface ExecuteCodeResponse {
  compile?: {
    output: string;
  };
  run?: {
    output: string;
    stderr: string;
  };
}

export interface ExecutionResult {
  code: string;
  output: string;
  error: string | null;
}

export interface CodeEditorState {
  language: string;
  fontSize: number;
  theme: string;
  code: string;
  output: string;
  isRunning: boolean;
  error: string | null;
  editor: monacoEditor.editor.IStandaloneCodeEditor | null;
  executionResult: {
    code: string;
    output: string;
    error: string | null;
  } | null;
  
  // Collaboration state
  isCollaborating: boolean;
  collaborators: string[];
   testCases: TestCase[];
  testResults: TestResult[];
  isRunningTests: boolean;

  // Methods
  getCode: () => string;
  setEditor: (editor: monacoEditor.editor.IStandaloneCodeEditor) => void;
  setCode: (code: string, fromCollab?: boolean) => void;
  setTheme: (theme: string) => void;
  setFontSize: (fontSize: number) => void;
  setLanguage: (language: string) => void;
  setCollaborating: (isCollaborating: boolean) => void;
  setCollaborators: (collaborators: string[]) => void;
  runCode: () => Promise<void>;
  getTestCaseTemplate: (language: string) => { input: string; expectedOutput: string };
  setTestCases: (testCases: TestCase[]) => void;
  addTestCase: (testCase?: Partial<TestCase>) => void;
  removeTestCase: (id: number) => void;
  updateTestCase: (id: number, field: keyof TestCase, value: any) => void;
  runTests: () => Promise<void>;
  setTestResults: (results: TestResult[]) => void;
  clearTestResults: () => void;
}

export interface Snippet {
  _id: Id<"snippets">;
  _creationTime: number;
  userId: string;
  language: string;
  code: string;
  title: string;
  userName: string;
}
// Add global window types for collaboration callbacks
declare global {
  interface Window {
    sendCodeChangeCallback?: (code: string) => void;
    sendOutputChangeCallback?: (output: string, error: string | null, isRunning: boolean) => void;
  }
}