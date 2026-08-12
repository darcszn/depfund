import type { ScanResult } from '@/types';

interface StatsBarProps {
  result: ScanResult;
}

export function StatsBar({ result }: StatsBarProps) {
  const pct = result.totalDependencies > 0
    ? Math.round((result.fundedCount / result.totalDependencies) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      {/* Summary numbers */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-slate-900">{result.totalDependencies}</p>
          <p className="text-xs text-slate-400 mt-0.5">Total packages</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">{result.fundedCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Have funding</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-400">{result.unfundedCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">No funding info</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Funding coverage</span>
          <span className="font-medium text-green-600">{pct}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${pct}% of packages have funding info`}
          />
        </div>
      </div>
    </div>
  );
}
