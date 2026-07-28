import { Trash2, AlertCircle } from 'lucide-react';

export default function OutputPanel({ output, error, onClear }: { output: string[], error: string | null, onClear: () => void }) {
  return (
    <div className="h-[35%] flex flex-col border-b border-stone-300 dark:border-zinc-800">
      <div className="px-4 py-1.5 bg-stone-50 dark:bg-zinc-950 border-b border-stone-300 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold text-stone-600 dark:text-zinc-400 uppercase tracking-widest">Output Console</span>
        <button onClick={onClear} className="text-stone-400 dark:text-zinc-600 hover:text-stone-700 dark:hover:text-zinc-300 transition-colors" title="Clear output">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 p-4 font-mono text-[12px] bg-stone-900 dark:bg-black text-stone-300 overflow-auto flex flex-col gap-1">
        {output.length === 0 && !error && (
          <span className="text-stone-500 italic">No output yet...</span>
        )}
        {output.map((line, i) => (
          <div key={i} className="flex gap-2 mb-1 text-stone-100">
            <span className="text-stone-600 dark:text-zinc-700">{'>'}</span> {line}
          </div>
        ))}
        {error && (
          <div className="flex gap-2 bg-red-950/50 text-red-400 p-2 border-l-2 border-red-500 mt-2 items-start">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="leading-tight">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
