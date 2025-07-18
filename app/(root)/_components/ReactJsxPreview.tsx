'use client';
import { useEffect, useRef, useState } from 'react';
import { useCodeEditorStore } from '@/src/store/useCodeEditorStore';

export default function ReactJsxPreview() {
  const { getCode } = useCodeEditorStore();
  const code = getCode();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    
    try {
      setError(null);
      setLogs([]);
      
      // Process the code - remove imports and handle exports
      let processedCode = code
        // Remove import statements
        .replace(/^\s*import\s+.*?;?\s*$/gm, "")
        // Handle export default function
        .replace(/^\s*export\s+default\s+function\s+(\w+)/gm, "function $1")
        // Handle export default arrow function
        .replace(/^\s*export\s+default\s+/gm, "const App = ")
        // Handle standalone function definitions that should be App
        .replace(/^function\s+(\w+)\s*\(/gm, (match, funcName) => {
          return `function App(`;
        });

      // If no App component is defined, wrap the code
      if (!processedCode.includes('App') && processedCode.trim()) {
        processedCode = `function App() { return (${processedCode.trim()}); }`;
      }

      // Create the HTML content for the iframe
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Preview</title>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <style>
        body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background-color: #ffffff;
            color: #333333;
        }
        #root {
            width: 100%;
            height: 100%;
        }
        .error {
            color: #ff4444;
            background-color: #ffebee;
            padding: 16px;
            border-radius: 4px;
            border-left: 4px solid #ff4444;
            font-family: monospace;
            white-space: pre-wrap;
        }
        .console-log {
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 8px;
            margin: 8px 0;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <div id="console-output"></div>
    
    <script type="text/babel">
        const { useState, useEffect, useRef } = React;
        
        // Override console methods to capture logs
        const originalConsole = { ...console };
        const consoleOutput = document.getElementById('console-output');
        
        function addConsoleMessage(type, args) {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            
            const div = document.createElement('div');
            div.className = 'console-log';
            div.style.borderLeftColor = type === 'error' ? '#ff4444' : 
                                       type === 'warn' ? '#ff9800' : '#2196f3';
            div.textContent = \`[\${type.toUpperCase()}] \${message}\`;
            consoleOutput.appendChild(div);
            
            // Also call original console method
            originalConsole[type](...args);
        }
        
        ['log', 'error', 'warn', 'info'].forEach(method => {
            console[method] = (...args) => addConsoleMessage(method, args);
        });
        
        try {
            ${processedCode}
            
            // Render the App component
            if (typeof App !== 'undefined') {
                const root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(<App />);
            } else {
                document.getElementById('root').innerHTML = '<div class="error">No App component found. Please define a component named App or export a default component.</div>';
            }
        } catch (error) {
            console.error('Error rendering React component:', error);
            document.getElementById('root').innerHTML = '<div class="error">Error: ' + error.message + '</div>';
        }
    </script>
</body>
</html>`;

      // Create a blob URL for the iframe to avoid cross-origin issues
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Set the iframe source to the blob URL
      iframe.src = url;
      
      // Clean up the blob URL when component unmounts or code changes
      return () => {
        URL.revokeObjectURL(url);
      };

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }, [code]);

  return (
    <div className="w-full h-full relative">
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-500/10 border border-red-500/20 text-red-400 p-3 text-sm z-10">
          <strong>Preview Error:</strong> {error}
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0 bg-white rounded-lg"
        title="React JSX Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}