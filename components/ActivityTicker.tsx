export default function ActivityTicker({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;

  // Duplicate the content so the scroll loop is seamless
  const content = [...items, ...items];

  return (
    <div className="w-full overflow-hidden border-b border-line bg-surface/60 backdrop-blur-sm">
      <div className="flex items-center">
        <div className="shrink-0 rh-eyebrow px-4 py-2 border-r border-line text-karat">
          Live Feed
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap animate-ticker-scroll">
            {content.map((text, i) => (
              <span
                key={i}
                className="inline-flex items-center px-6 py-2 text-xs font-mono text-parchment-dim"
              >
                <span className="w-1 h-1 rounded-full bg-karat mr-3" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
