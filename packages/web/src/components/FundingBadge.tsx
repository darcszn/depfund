import type { FundingLink } from '@/types';

interface FundingBadgeProps {
  link: FundingLink;
}

const TYPE_STYLES: Record<string, string> = {
  github: 'bg-slate-800 text-white',
  patreon: 'bg-orange-100 text-orange-700',
  opencollective: 'bg-blue-100 text-blue-700',
  ko_fi: 'bg-yellow-100 text-yellow-800',
  liberapay: 'bg-yellow-200 text-yellow-900',
  tidelift: 'bg-indigo-100 text-indigo-700',
  custom: 'bg-slate-100 text-slate-600',
};

const TYPE_LABELS: Record<string, string> = {
  github: '♥ GitHub',
  patreon: '🎨 Patreon',
  opencollective: '🌐 OC',
  ko_fi: '☕ Ko-fi',
  liberapay: '💛 Liberapay',
  tidelift: '🔒 Tidelift',
  custom: '🔗 Fund',
};

export function FundingBadge({ link }: FundingBadgeProps) {
  const style = TYPE_STYLES[link.type] || TYPE_STYLES.custom;
  const label = TYPE_LABELS[link.type] || link.type;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-opacity hover:opacity-80 ${style}`}
      title={link.url}
      aria-label={`${label} — ${link.url}`}
    >
      {label}
    </a>
  );
}
