import { useState } from 'react';
import { EXAMPLES } from '../examples';
import { ChevronDown } from 'lucide-react';

export default function ExampleDropdown({ onSelect }: { onSelect: (code: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative group flex items-center gap-2">
      <span className="text-[10px] font-bold text-stone-400 dark:text-zinc-500 uppercase tracking-widest hidden sm:block">Template:</span>
      <button 
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="bg-stone-50 dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 px-3 py-1 text-xs font-mono text-stone-700 dark:text-zinc-300 outline-none hover:border-stone-400 dark:hover:border-zinc-500 text-left min-w-[140px] flex justify-between items-center transition-colors"
      >
        <span>Select Example</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 z-[60] shadow-sm overflow-hidden">
          {EXAMPLES.map(ex => (
            <button
              key={ex.name}
              onClick={() => {
                onSelect(ex.code);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-xs font-mono text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-emerald-700 dark:hover:text-emerald-500 transition-colors"
            >
              {ex.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
