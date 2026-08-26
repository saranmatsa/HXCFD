import { useState, type ReactNode } from "react";

// ─── Helper: Icon ─────────────────────────────────────────────────────────
const iconPaths: Record<string, ReactNode> = {
  import: (
    <>
      <path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5" />
      <path d="M5 13v6h14v-6" />
    </>
  ),
  mesh: <path d="M4 5h16M4 12h16M4 19h16M7 3l3 18M17 3l-3 18" />,
  setup: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.05 2.05-.06-.06A1.7 1.7 0 0 0 15.8 18.6a1.7 1.7 0 0 0-1 1.55v.1h-2.9v-.1a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.05-2.05.06-.06A1.7 1.7 0 0 0 7.3 15a1.7 1.7 0 0 0-1.55-1H5.6v-2.9h.15a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06L8.95 6.1l.06.06A1.7 1.7 0 0 0 10.9 6.5a1.7 1.7 0 0 0 1-1.55v-.1h2.9v.1a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.05 2.05-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1h.1V14h-.1a1.7 1.7 0 0 0-1.54 1Z" />
    </>
  ),
  simulate: (
    <>
      <path d="M5 5h5v5H5zM14 14h5v5h-5zM7.5 10v2a2 2 0 0 0 2 2H14" />
      <path d="m12 17 2 2 2-2" />
    </>
  ),
  analyze: (
    <>
      <path d="M4 20V4M4 20h17" />
      <path d="m7 15 4-4 3 2 5-7" />
    </>
  ),
  export: (
    <>
      <path d="M6 3h9l3 3v15H6zM14 3v4h4" />
      <path d="M9 12h6m-6 4h6" />
    </>
  ),
  optimize: (
    <>
      <path d="M4 19 9 13l3 3 7-10" />
      <path d="M15 6h4v4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4" />
    </>
  ),
  projects: (
    <>
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2.5h6.5A2.5 2.5 0 0 1 21 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
      <path d="M3 9h18" />
    </>
  ),
  ai: (
    <>
      <path d="M12 2.8 13.9 9l6.3 1.9-6.3 1.9L12 19l-1.9-6.2-6.3-1.9L10.1 9 12 2.8Z" />
    </>
  ),
  spark: <path d="M12 2.8 13.9 9l6.3 1.9-6.3 1.9L12 19l-1.9-6.2-6.3-1.9L10.1 9 12 2.8Z" />,
  warning: (
    <>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v4m0 3h.01" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  play: <path d="m9 5 10 7-10 7z" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  folder: <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
  archive: <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3m18 0v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8M10 12h4M10 16h4" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4" />
    </>
  ),
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16M4 14h16" />
      <path d="M9 2v2M15 2v2M9 20v2M15 20v2" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  menu: (
    <>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </>
  ),
};

export const Icon = ({ name, size = 16 }: { name: string; size?: number }) => (
  <svg
    className="icon"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {iconPaths[name]}
  </svg>
);

// ─── Helper: IconButton ──────────────────────────────────────────────────
export const IconButton = ({
  icon,
  label,
  onClick,
  disabled,
  className = "",
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => (
  <button
    className={`icon-button ${className}`}
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
  >
    <Icon name={icon} />
  </button>
);

// ─── Helper: Glass Card ──────────────────────────────────────────────────
export function GlassCard({
  children,
  className = "",
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div
      {...props}
      className={`relative backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 rounded-2xl overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10 p-6">{children}</div>
    </div>
  );
}

// ─── Helper: Floating Label Input ────────────────────────────────────────
export function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  error,
  icon,
  multiline,
  rows,
  ...props
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  icon?: ReactNode;
  multiline?: boolean;
  rows?: number;
  [key: string]: any;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;

  if (multiline) {
    return (
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows || 4}
          className={`
            w-full bg-gray-900/80 border-2 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600
            transition-all duration-200 resize-none
            ${focused ? "border-blue-500/50 ring-2 ring-blue-500/20" : error ? "border-red-500/50" : "border-gray-700 hover:border-gray-600"}
            ${hasValue || focused ? "pt-5 pb-2" : "pt-3.5"}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          {...props}
        />
        <label
          className={`
            absolute left-4 transition-all duration-200 pointer-events-none
            ${hasValue || focused ? "top-1.5 text-xs text-blue-400" : "top-3.5 text-sm text-gray-500"}
            ${error ? "text-red-400" : ""}
          `}
        >
          {label}
        </label>
        {error && <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">⚠ {error}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">{icon}</div>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full bg-gray-900/80 border-2 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600
          transition-all duration-200
          ${icon ? "pl-10" : "pl-4"}
          ${focused ? "border-blue-500/50 ring-2 ring-blue-500/20" : error ? "border-red-500/50" : "border-gray-700 hover:border-gray-600"}
          ${hasValue || focused ? "pt-5 pb-2" : "pt-3.5"}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        {...props}
      />
      <label
        className={`
          absolute left-4 transition-all duration-200 pointer-events-none
          ${hasValue || focused ? "top-1.5 text-xs text-blue-400" : "top-3.5 text-sm text-gray-500"}
          ${error ? "text-red-400" : ""}
        `}
      >
        {label}
      </label>
      {error && <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

// ─── Helper: Select with Floating Label ──────────────────────────────────
export function FloatingSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        className={`
          w-full bg-gray-900/80 border-2 rounded-xl px-4 py-3.5 text-white appearance-none
          transition-all duration-200
          ${focused ? "border-blue-500/50 ring-2 ring-blue-500/20" : error ? "border-red-500/50" : "border-gray-700 hover:border-gray-600"}
          ${hasValue || focused ? "pt-5 pb-2" : "pt-3.5"}
          disabled:opacity-50 disabled:cursor-not-allowed
          pr-10
        `}
      >
        <option value="" disabled>
          {placeholder || `Select ${label}...`}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
        ▼
      </div>
      <label
        className={`
          absolute left-4 transition-all duration-200 pointer-events-none
          ${hasValue || focused ? "top-1.5 text-xs text-blue-400" : "top-3.5 text-sm text-gray-500"}
          ${error ? "text-red-400" : ""}
        `}
      >
        {label}
      </label>
      {error && <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

// ─── Helper: Status Badge ───────────────────────────────────────────────
export function StatusBadge({ status }: { status: "pending" | "generating" | "meshing" | "optimizing" | "completed" | "failed" }) {
  const styles: Record<string, string> = {
    pending: "bg-gray-700 text-gray-300",
    generating: "bg-blue-900/50 text-blue-300 animate-pulse",
    meshing: "bg-amber-900/50 text-amber-300 animate-pulse",
    optimizing: "bg-purple-900/50 text-purple-300 animate-pulse",
    completed: "bg-green-900/50 text-green-300",
    failed: "bg-red-900/50 text-red-300",
  };
  const icons: Record<string, ReactNode> = {
    pending: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    generating: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 17h8" />
        <path d="M12 11v6" />
      </svg>
    ),
    meshing: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M4 12h16" />
        <path d="M12 4v16" />
      </svg>
    ),
    optimizing: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    completed: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    failed: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {icons[status]} {status.toUpperCase()}
    </span>
  );
}

// ─── Helper: Progress Ring ──────────────────────────────────────────────
export function ProgressRing({ progress, size = 64, stroke = 6 }: { progress: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f2937" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#progress-gradient)"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
        style={{ filter: "drop-shadow(0 0 4px rgba(59,130,246,0.6))" }}
      />
      <defs>
        <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Helper: Artifact Card ──────────────────────────────────────────────
export function ArtifactCard({ icon, label, path, color }: { icon: ReactNode; label: string; path: string; color: "blue" | "amber" | "purple" }) {
  const colors = {
    blue: "bg-blue-500/20 border-blue-500/30 text-blue-300",
    amber: "bg-amber-500/20 border-amber-500/30 text-amber-300",
    purple: "bg-purple-500/20 border-purple-500/30 text-purple-300",
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color]} group`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <span className="font-medium text-white">{label}</span>
      </div>
      <code className="text-xs text-gray-400 break-all block w-full overflow-hidden text-ellipsis whitespace-nowrap group-hover:text-gray-200 transition-colors">
        {path}
      </code>
    </div>
  );
}