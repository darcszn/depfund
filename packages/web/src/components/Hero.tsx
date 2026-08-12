export function Hero() {
  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1 rounded-full mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Supports npm · PyPI · crates.io
      </div>

      <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
        Find out which of your
        <span className="text-green-600"> dependencies</span>
        <br />
        need your support
      </h1>

      <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
        Upload your <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">package.json</code>,{' '}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">requirements.txt</code>, or{' '}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">Cargo.toml</code> and instantly
        see which packages have funding links — GitHub Sponsors, Patreon, OpenCollective, and more.
      </p>

      <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400 mb-2">
        {[
          { icon: '🔒', label: 'Files never stored' },
          { icon: '⚡', label: 'Results in seconds' },
          { icon: '🌍', label: 'All major ecosystems' },
          { icon: '📥', label: 'Export as JSON or Markdown' },
        ].map(({ icon, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span>{icon}</span>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
