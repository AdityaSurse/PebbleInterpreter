/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Lexer } from './interpreter/lexer';
import { Parser } from './interpreter/parser';
import { Interpreter, TraceStep } from './interpreter/interpreter';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import ExecutionTrace from './components/ExecutionTrace';
import ExampleDropdown from './components/ExampleDropdown';
import { EXAMPLES } from './examples';
import { Play, Share, Settings, BookOpen, Folder, Sun, Moon, TerminalSquare } from 'lucide-react';

export default function App() {
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [output, setOutput] = useState<string[]>([]);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const runCode = () => {
    setOutput([]);
    setTrace([]);
    setError(null);
    try {
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();
      
      const interpreter = new Interpreter();
      interpreter.evaluate(program);
      
      setOutput(interpreter.getOutput());
      setTrace(interpreter.getTrace());
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-stone-100 dark:bg-zinc-950 text-stone-900 dark:text-zinc-100 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-12 bg-white dark:bg-zinc-900 border-b border-stone-300 dark:border-zinc-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <TerminalSquare className="w-5 h-5 text-emerald-700 dark:text-emerald-500" />
          <h1 className="text-sm font-bold tracking-tight text-stone-800 dark:text-zinc-100">Pebble<span className="text-emerald-700 dark:text-emerald-500 font-medium">Interpreter</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <ExampleDropdown onSelect={setCode} />
          <div className="h-4 w-[1px] bg-stone-300 dark:bg-zinc-700 mx-2"></div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 transition-colors">
            <Share className="w-3.5 h-3.5" />
            Share
          </button>
          <button 
            onClick={runCode}
            className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white px-4 py-1.5 font-semibold text-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Run Code
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="flex flex-col items-center py-4 gap-2 bg-stone-50 dark:bg-zinc-950 border-r border-stone-300 dark:border-zinc-800 w-12 shrink-0">
          <button className="w-8 h-8 flex items-center justify-center bg-stone-200 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 transition-colors">
             <Folder className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setCheatSheetOpen(!cheatSheetOpen)}
            className="w-8 h-8 flex items-center justify-center text-stone-500 dark:text-zinc-500 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors"
            title="Toggle Cheat Sheet"
          >
             <BookOpen className="w-4 h-4" />
          </button>
          <div className="mt-auto flex flex-col gap-2">
            <button className="w-8 h-8 flex items-center justify-center text-stone-500 dark:text-zinc-500 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors" onClick={() => setIsDarkMode(!isDarkMode)}>
               {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-stone-500 dark:text-zinc-500 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors">
               <Settings className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Editor */}
          <section className="w-full md:w-[60%] flex flex-col border-r border-stone-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-w-0">
            {/* Tabs */}
            <div className="flex items-center justify-between px-4 py-2 bg-stone-50 dark:bg-zinc-950 border-b border-stone-300 dark:border-zinc-800 shrink-0">
              <div className="flex gap-4">
                 <span className="text-[11px] font-bold text-stone-800 dark:text-zinc-200 border-b-2 border-emerald-700 dark:border-emerald-500 pb-1 cursor-default">main.pebble</span>
              </div>
            </div>
            {/* Editor Body */}
            <CodeEditor code={code} onChange={setCode} />
            
            {/* Cheat Sheet */}
            <div className="border-t border-stone-300 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 shrink-0">
              <div 
                className="px-4 py-1.5 flex justify-between items-center border-b border-stone-300 dark:border-zinc-800 cursor-pointer hover:bg-stone-100 dark:hover:bg-zinc-900 transition-colors"
                onClick={() => setCheatSheetOpen(!cheatSheetOpen)}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-zinc-400">Cheat Sheet</span>
                <span className="text-stone-400 text-xs font-mono">{cheatSheetOpen ? '[-]' : '[+]'}</span>
              </div>
              {cheatSheetOpen && (
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-zinc-900 font-mono text-[11px]">
                  <div>
                    <p className="font-bold text-stone-700 dark:text-zinc-300 mb-1">Variables & Arrays</p>
                    <code className="block text-stone-500 dark:text-zinc-400">let x = 5;</code>
                    <code className="block text-stone-500 dark:text-zinc-400">let s = "hi";</code>
                    <code className="block text-stone-500 dark:text-zinc-400">let arr = [1, 2];</code>
                  </div>
                  <div>
                    <p className="font-bold text-stone-700 dark:text-zinc-300 mb-1">Loops</p>
                    <code className="block text-stone-500 dark:text-zinc-400">while (x {'<'} 10) {'{...}'}</code>
                    <code className="block text-stone-500 dark:text-zinc-400">for (let i=0; i{'<'}5; i=i+1) {'{...}'}</code>
                  </div>
                  <div>
                    <p className="font-bold text-stone-700 dark:text-zinc-300 mb-1">Conditionals</p>
                    <code className="block text-stone-500 dark:text-zinc-400">if (x == 5) {'{...}'}</code>
                  </div>
                  <div>
                    <p className="font-bold text-stone-700 dark:text-zinc-300 mb-1">Built-ins</p>
                    <code className="block text-stone-500 dark:text-zinc-400">print(x);</code>
                    <code className="block text-stone-500 dark:text-zinc-400">let v = input();</code>
                    <code className="block text-stone-500 dark:text-zinc-400">len(arr); push(arr, 3);</code>
                    <code className="block text-stone-500 dark:text-zinc-400">abs(-5); max(1, 2);</code>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right Panel: Output & Trace */}
          <section className="w-full md:w-[40%] flex flex-col min-w-0 bg-stone-50 dark:bg-zinc-950">
            <OutputPanel output={output} error={error} onClear={() => {setOutput([]); setError(null)}} />
            <ExecutionTrace trace={trace} />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-6 bg-stone-900 dark:bg-black text-stone-400 px-4 flex items-center justify-between text-[10px] font-medium shrink-0">
        <div className="flex items-center gap-4 font-mono">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 ${error ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
            <span>{error ? 'ERROR' : 'READY'}</span>
          </div>
        </div>
        <div className="flex gap-6 uppercase tracking-wider font-mono">
          <span>UTF-8</span>
          <span>Ln 1, Col 1</span>
        </div>
      </footer>
    </div>
  );
}

