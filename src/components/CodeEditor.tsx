import React, { useState, useRef } from 'react';

export default function CodeEditor({ code, onChange }: { code: string; onChange: (code: string) => void }) {
  const lines = code.split('\n');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      
      const newValue = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const highlight = (text: string) => {
    const keywords = ['let', 'if', 'else', 'while', 'print', 'true', 'false'];
    const operators = ['+', '-', '*', '/', '%', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '='];
    
    const tokenRegex = /([a-zA-Z_]\w*|\d+(?:\.\d+)?|\/\/.*|[\+\-\*\/\%=\!\<\>\&\|]+|[\(\)\{\}\;]|\s+)/g;
    
    return text.split(tokenRegex).map((token, i) => {
      if (!token) return null;
      if (keywords.includes(token)) return <span key={i} className="text-emerald-700 dark:text-emerald-500 font-bold">{token}</span>;
      if (token.startsWith('//')) return <span key={i} className="text-stone-400 dark:text-zinc-500 italic">{token}</span>;
      if (/^\d/.test(token)) return <span key={i} className="text-amber-700 dark:text-amber-500">{token}</span>;
      if (operators.includes(token)) return <span key={i} className="text-stone-600 dark:text-zinc-400">{token}</span>;
      if (token === 'print') return <span key={i} className="text-emerald-700 dark:text-emerald-500 italic">{token}</span>;
      return <span key={i} className="dark:text-zinc-200">{token}</span>;
    });
  };

  return (
    <div className="flex-1 flex overflow-hidden font-mono text-[13px]">
      {/* Gutter */}
      <div className="bg-stone-50 dark:bg-zinc-950 text-stone-400 dark:text-zinc-600 py-4 flex flex-col border-r border-stone-300 dark:border-zinc-800 w-12 shrink-0 select-none text-right pr-3 overflow-hidden">
        {lines.map((_, i) => (
          <span key={i} className="leading-relaxed">{i + 1}</span>
        ))}
      </div>
      
      {/* Editor */}
      <div className="flex-1 relative bg-white dark:bg-zinc-900">
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-stone-900 dark:caret-zinc-100 resize-none outline-none leading-relaxed whitespace-pre font-mono z-10"
          spellCheck={false}
        />
        <pre 
           ref={preRef}
           className="absolute inset-0 w-full h-full p-4 bg-transparent text-stone-800 dark:text-zinc-200 pointer-events-none overflow-hidden leading-relaxed whitespace-pre font-mono z-0 m-0"
        >
          {highlight(code)}
        </pre>
      </div>
    </div>
  );
}


