import { TraceStep } from '../interpreter/interpreter';

export default function ExecutionTrace({ trace }: { trace: TraceStep[] }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-900">
      <div className="px-4 py-1.5 bg-stone-50 dark:bg-zinc-950 border-b border-stone-300 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold text-stone-600 dark:text-zinc-400 uppercase tracking-widest">Execution Trace</span>
        <span className="text-[10px] bg-stone-200 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 px-2 py-0.5 font-mono">{trace.length} Steps</span>
      </div>
      <div className="flex-1 overflow-auto">
        {trace.length === 0 ? (
          <div className="p-4 text-stone-400 dark:text-zinc-600 italic text-xs font-mono">Run the code to see the trace.</div>
        ) : (
          <table className="w-full text-left text-[11px] font-mono border-collapse">
            <thead className="bg-stone-100 dark:bg-zinc-900 text-stone-500 dark:text-zinc-400 sticky top-0 border-b border-stone-300 dark:border-zinc-800 z-10">
              <tr>
                <th className="p-2 font-normal">#</th>
                <th className="p-2 font-normal">Line</th>
                <th className="p-2 font-normal">Statement</th>
                <th className="p-2 font-normal">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-zinc-800/50">
              {trace.map((step, index) => (
                <tr key={step.step} className={index % 2 === 1 ? 'bg-stone-50/50 dark:bg-zinc-900/50' : 'bg-white dark:bg-zinc-900'}>
                  <td className="p-2 text-stone-400 dark:text-zinc-500">{String(step.step).padStart(3, '0')}</td>
                  <td className="p-2 text-stone-700 dark:text-zinc-300">{step.line}</td>
                  <td className="p-2 text-stone-700 dark:text-zinc-300 whitespace-nowrap">{step.statement}</td>
                  <td className="p-2 text-emerald-700 dark:text-emerald-500 whitespace-nowrap">
                    {'{ '}
                    {Object.entries(step.state).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    {' }'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
