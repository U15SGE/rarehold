"use client";

interface GlobeNode {
  id: string;
  label: string;
  href?: string;
  angle: number; // position around the orbit ring, in degrees
}

export default function DiscoveryGlobe({ nodes = [] }: { nodes?: GlobeNode[] }) {
  const radius = 220;
  const center = 240;

  return (
    <div className="relative w-[480px] h-[480px] max-w-full mx-auto">
      <svg viewBox="0 0 480 480" className="w-full h-full" aria-hidden="true">
        <defs>
          <radialGradient id="globeGlow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#c9a35a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#c9a35a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="240" cy="240" r="230" fill="url(#globeGlow)" />

        {/* Outer sphere boundary */}
        <circle cx="240" cy="240" r="150" fill="none" stroke="#2a2833" strokeWidth="1" />

        {/* Latitude lines (static, give the sphere depth) */}
        {[-60, -30, 0, 30, 60].map((lat, i) => {
          const ry = Math.max(150 * Math.cos((lat * Math.PI) / 180) * 0.28, 4);
          const cy = 240 - lat * 1.6;
          return (
            <ellipse
              key={`lat-${i}`}
              cx="240"
              cy={cy}
              rx="150"
              ry={ry}
              fill="none"
              stroke="#2a2833"
              strokeWidth="0.75"
              opacity={0.7}
            />
          );
        })}

        {/* Rotating meridian lines create the "spinning sphere" illusion */}
        <g className="animate-spin-slow" style={{ transformOrigin: "240px 240px" }}>
          {[0, 30, 60, 90, 120, 150].map((deg, i) => (
            <ellipse
              key={`merid-${i}`}
              cx="240"
              cy="240"
              rx="37.5"
              ry="150"
              fill="none"
              stroke="#3a3742"
              strokeWidth="0.75"
              opacity={0.6}
              transform={`rotate(${deg} 240 240)`}
            />
          ))}
        </g>

        {/* Core sphere fill for subtle depth */}
        <circle cx="240" cy="240" r="149" fill="#0a0a0d" opacity="0.35" />

        {/* Orbit ring carrying the discovery nodes */}
        <g className="animate-spin-slower" style={{ transformOrigin: "240px 240px" }}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#2a2833"
            strokeWidth="1"
            strokeDasharray="2 6"
          />
          {nodes.map((node) => {
            const rad = (node.angle * Math.PI) / 180;
            const x = center + radius * Math.cos(rad);
            const y = center + radius * Math.sin(rad);
            return (
              <circle
                key={node.id}
                cx={x}
                cy={y}
                r="4"
                fill="#c9a35a"
                className="animate-pulse-node"
              />
            );
          })}
        </g>
      </svg>

      {/* Node labels, counter-rotated so text stays upright and clickable */}
      <div className="absolute inset-0 animate-spin-slower" style={{ transformOrigin: "50% 50%" }}>
        {nodes.map((node) => {
          const rad = (node.angle * Math.PI) / 180;
          const x = 50 + (radius / 480) * 100 * Math.cos(rad);
          const y = 50 + (radius / 480) * 100 * Math.sin(rad);
          return (
            <div
              key={node.id}
              className="absolute animate-spin-slow-reverse"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {node.href ? (
                <a
                  href={node.href}
                  className="whitespace-nowrap text-[10px] font-mono uppercase tracking-wider text-karat/80 hover:text-karat bg-ink/70 px-1.5 py-0.5 rounded border border-line"
                >
                  {node.label}
                </a>
              ) : (
                <span className="whitespace-nowrap text-[10px] font-mono uppercase tracking-wider text-parchment-dim bg-ink/70 px-1.5 py-0.5 rounded border border-line">
                  {node.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
