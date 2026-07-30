/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Lexer } from './interpreter/lexer';
import { Parser } from './interpreter/parser';
import { Interpreter, TraceStep } from './interpreter/interpreter';
import { Compiler } from './interpreter/compiler';
import { VM } from './interpreter/vm';
import { Chunk } from './interpreter/bytecode';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import ExecutionTrace from './components/ExecutionTrace';
import ExampleDropdown from './components/ExampleDropdown';
import { EXAMPLES } from './examples';
import { Play, Download, Settings, BookOpen, Folder, Sun, Moon, TerminalSquare, Upload, Cpu, FileCode } from 'lucide-react';

export default function App() {
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [output, setOutput] = useState<string[]>([]);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  type RightTab = 'output' | 'bytecode' | 'cheatsheet';
  const [rightTab, setRightTab] = useState<RightTab>('output');
  type ExecMode = 'ast' | 'vm';
  const [execMode, setExecMode] = useState<ExecMode>('vm');
  const [bytecode, setBytecode] = useState<string[]>([]);
  const [benchTime, setBenchTime] = useState<number | null>(null);

  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check for code in URL
    const params = new URLSearchParams(window.location.search);
    const encodedCode = params.get('code');
    if (encodedCode) {
      try {
        setCode(atob(encodedCode));
      } catch (e) {
        console.error("Failed to decode code from URL");
      }
    }
  }, []);

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'script.pebble';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCode(text);
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset input
    }
  };

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
    setBytecode([]);
    setError(null);
    setBenchTime(null);
    try {
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();
      
      const startTime = performance.now();
      
      if (execMode === 'ast') {
        const interpreter = new Interpreter();
        interpreter.evaluate(program);
        setOutput(interpreter.getOutput());
        setTrace(interpreter.getTrace());
      } else {
        const compiler = new Compiler();
        const mainFunction = compiler.compile(program);
        setBytecode(mainFunction.chunk.disassemble("main"));
        
        const vm = new VM();
        vm.run(mainFunction);
        setOutput(vm.getOutput());
      }
      
      const endTime = performance.now();
      setBenchTime(endTime - startTime);
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
          <h1 className="text-sm font-bold tracking-tight text-stone-800 dark:text-zinc-100">Pebble<span className="text-emerald-700 dark:text-emerald-500 font-medium">VM</span></h1>
          
          <div className="h-4 w-[1px] bg-stone-300 dark:bg-zinc-700 mx-2"></div>
          <div className="flex items-center bg-stone-200 dark:bg-zinc-800 p-0.5 rounded">
            <button 
              onClick={() => setExecMode('ast')}
              className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${execMode === 'ast' ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100'}`}
            >
              AST Walk
            </button>
            <button 
              onClick={() => setExecMode('vm')}
              className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors flex items-center gap-1 ${execMode === 'vm' ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100'}`}
            >
              <Cpu className="w-3 h-3" />
              VM Compile
            </button>
          </div>
          
          {benchTime !== null && (
             <div className="text-xs font-mono text-stone-500 dark:text-zinc-400 ml-2">
               {benchTime.toFixed(2)}ms
             </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <ExampleDropdown onSelect={setCode} />
          <div className="h-4 w-[1px] bg-stone-300 dark:bg-zinc-700 mx-2"></div>
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
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
          <input 
            type="file" 
            accept=".pebble" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center text-stone-500 dark:text-zinc-500 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors"
            title="Import .pebble file"
          >
             <Upload className="w-4 h-4" />
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
          </section>

          {/* Right Panel: Output & Trace */}
          <section className="w-full md:w-[40%] flex flex-col min-w-0 bg-stone-50 dark:bg-zinc-950">
            {/* Tabs for Right Panel */}
            <div className="flex px-4 pt-2 border-b border-stone-300 dark:border-zinc-800 bg-stone-100 dark:bg-zinc-900 gap-4 shrink-0 overflow-x-auto no-scrollbar">
               <button 
                 onClick={() => setRightTab('output')} 
                 className={`text-[11px] font-bold pb-2 border-b-2 whitespace-nowrap ${rightTab === 'output' ? 'text-emerald-700 dark:text-emerald-500 border-emerald-700 dark:border-emerald-500' : 'text-stone-500 dark:text-zinc-500 border-transparent hover:text-stone-800 dark:hover:text-zinc-300'}`}
               >
                 OUTPUT & TRACE
               </button>
               <button 
                 onClick={() => setRightTab('bytecode')} 
                 className={`text-[11px] font-bold pb-2 border-b-2 flex items-center gap-1 whitespace-nowrap ${rightTab === 'bytecode' ? 'text-emerald-700 dark:text-emerald-500 border-emerald-700 dark:border-emerald-500' : 'text-stone-500 dark:text-zinc-500 border-transparent hover:text-stone-800 dark:hover:text-zinc-300'}`}
               >
                 <FileCode className="w-3 h-3" /> BYTECODE
               </button>
               <button 
                 onClick={() => setRightTab('cheatsheet')} 
                 className={`text-[11px] font-bold pb-2 border-b-2 flex items-center gap-1 whitespace-nowrap ${rightTab === 'cheatsheet' ? 'text-emerald-700 dark:text-emerald-500 border-emerald-700 dark:border-emerald-500' : 'text-stone-500 dark:text-zinc-500 border-transparent hover:text-stone-800 dark:hover:text-zinc-300'}`}
               >
                 <BookOpen className="w-3 h-3" /> CHEAT SHEET
               </button>
            </div>
            
            {rightTab === 'bytecode' && (
              <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-900 border-b md:border-b-0 border-stone-300 dark:border-zinc-800">
                <div className="flex-1 overflow-auto p-4 font-mono text-xs whitespace-pre bg-stone-50 dark:bg-zinc-950 text-stone-800 dark:text-zinc-300">
                  {bytecode.length > 0 ? bytecode.join('\n') : <span className="text-stone-400">Run the code in VM mode to see bytecode.</span>}
                </div>
              </div>
            )}
            
            {rightTab === 'cheatsheet' && (
              <div className="flex-1 overflow-auto bg-white dark:bg-zinc-900 p-6 font-mono text-xs text-stone-800 dark:text-zinc-300 border-b md:border-b-0 border-stone-300 dark:border-zinc-800">
                 <h2 className="text-sm font-bold text-emerald-700 dark:text-emerald-500 mb-4">Pebble Language Cheat Sheet</h2>
                 
                 <div className="space-y-6">
                    <div>
                      <p className="font-bold text-stone-700 dark:text-zinc-100 mb-2 border-b border-stone-200 dark:border-zinc-800 pb-1">Variables & Primitives</p>
                      <code className="block text-stone-500 dark:text-zinc-400">let x = 5;</code>
                      <code className="block text-stone-500 dark:text-zinc-400">let name = "pebble";</code>
                      <code className="block text-stone-500 dark:text-zinc-400">let isAwesome = true;</code>
                    </div>
                    
                    <div>
                      <p className="font-bold text-stone-700 dark:text-zinc-100 mb-2 border-b border-stone-200 dark:border-zinc-800 pb-1">Arrays & Objects</p>
                      <code className="block text-stone-500 dark:text-zinc-400">let arr = [1, 2, 3];</code>
                      <code className="block text-stone-500 dark:text-zinc-400">let obj = {'{'} key: "value" {'}'};</code>
                      <code className="block text-stone-500 dark:text-zinc-400">arr[0] = 5;</code>
                    </div>
                    
                    <div>
                      <p className="font-bold text-stone-700 dark:text-zinc-100 mb-2 border-b border-stone-200 dark:border-zinc-800 pb-1">Control Flow</p>
                      <code className="block text-stone-500 dark:text-zinc-400">if (x {'>'} 0) {'{'} ... {'}'} else {'{'} ... {'}'}</code>
                      <code className="block text-stone-500 dark:text-zinc-400">while (x {'<'} 10) {'{'} x = x + 1; {'}'}</code>
                      <code className="block text-stone-500 dark:text-zinc-400">for (let i = 0; i {'<'} 5; i = i + 1) {'{'} ... {'}'}</code>
                    </div>
                    
                    <div>
                      <p className="font-bold text-stone-700 dark:text-zinc-100 mb-2 border-b border-stone-200 dark:border-zinc-800 pb-1">Functions</p>
                      <code className="block text-stone-500 dark:text-zinc-400">def add(a, b) {'{'}</code>
                      <code className="block text-stone-500 dark:text-zinc-400 ml-4">return a + b;</code>
                      <code className="block text-stone-500 dark:text-zinc-400">{'}'}</code>
                      <code className="block text-stone-500 dark:text-zinc-400">print(add(1, 2));</code>
                    </div>
                    
                    <div>
                      <p className="font-bold text-stone-700 dark:text-zinc-100 mb-2 border-b border-stone-200 dark:border-zinc-800 pb-1">Classes & Objects (OOP)</p>
                      <code className="block text-stone-500 dark:text-zinc-400">class Person {'{'}</code>
                      <code className="block text-stone-500 dark:text-zinc-400 ml-4">def init(name) {'{'}</code>
                      <code className="block text-stone-500 dark:text-zinc-400 ml-8">this.name = name;</code>
                      <code className="block text-stone-500 dark:text-zinc-400 ml-4">{'}'}</code>
                      <code className="block text-stone-500 dark:text-zinc-400 ml-4">def greet() {'{'}</code>
                      <code className="block text-stone-500 dark:text-zinc-400 ml-8">print("Hi, " + this.name);</code>
                      <code className="block text-stone-500 dark:text-zinc-400 ml-4">{'}'}</code>
                      <code className="block text-stone-500 dark:text-zinc-400">{'}'}</code>
                      <code className="block text-stone-500 dark:text-zinc-400">let p = new Person("Pebble");</code>
                      <code className="block text-stone-500 dark:text-zinc-400">p.greet();</code>
                    </div>
                 </div>
              </div>
            )}
            
            {rightTab === 'output' && (
              <>
                <OutputPanel output={output} error={error} onClear={() => {setOutput([]); setError(null)}} />
                <ExecutionTrace trace={trace} />
              </>
            )}
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

