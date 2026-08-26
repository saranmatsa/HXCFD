import { useState, useEffect, useRef, useCallback } from "react";
import { api, type ProviderInfo, type JobStatus } from "../services/api";

// ─── Helper: Status Badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: JobStatus["status"] }) {
  const styles: Record<JobStatus["status"], string> = {
    pending: "bg-gray-700 text-gray-300",
    generating: "bg-blue-900/50 text-blue-300 animate-pulse",
    meshing: "bg-amber-900/50 text-amber-300 animate-pulse",
    optimizing: "bg-purple-900/50 text-purple-300 animate-pulse",
    completed: "bg-green-900/50 text-green-300",
    failed: "bg-red-900/50 text-red-300",
  };
  const icons: Record<JobStatus["status"], React.ReactNode> = {
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
function ProgressRing({ progress, size = 64, stroke = 6 }: { progress: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1f2937"
        strokeWidth={stroke}
      />
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

// ─── Helper: Glass Card ─────────────────────────────────────────────────
function GlassCard({ children, className = "", ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) {
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

// ─── Helper: Floating Label Input ───────────────────────────────────────
function FloatingInput({
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
  icon?: React.ReactNode;
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

// ─── Helper: Select with Floating Label ─────────────────────────────────
function FloatingSelect({
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
        <option value="" disabled>{placeholder || `Select ${label}...`}</option>
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

// ─── Main Component ─────────────────────────────────────────────────────
export function AIGenerateTab() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderInfo["id"]>("");
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [cadFormat, setCadFormat] = useState<"step" | "stl" | "brep">("step");
  const [runMeshing, setRunMeshing] = useState(true);
  const [runOptimization, setRunOptimization] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load Providers ──────────────────────────────────────────────────
  const loadProviders = useCallback(async () => {
    try {
      const res = await api.listProviders();
      setProviders(res.providers);
      if (res.providers.length > 0 && !selectedProvider) {
        setSelectedProvider(res.providers[0].id);
      }
    } catch (e) {
      setError("Failed to load providers: " + (e as Error).message);
    }
  }, [selectedProvider]);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  // ─── Provider/Model Handlers ─────────────────────────────────────────
  const handleProviderChange = useCallback(async (providerId: string) => {
    setSelectedProvider(providerId);
    setModels([]);
    setSelectedModel("");
    setProviderError(null);
    if (!apiKey) return;
    try {
      const res = await api.fetchModels(providerId, apiKey);
      setModels(res.models);
      if (res.models.length > 0) setSelectedModel(res.models[0]);
    } catch (e) {
      setProviderError("Failed to fetch models: " + (e as Error).message);
    }
  }, [apiKey]);

  const handleApiKeyChange = useCallback(async (key: string) => {
    setApiKey(key);
    setKeyError(null);
    if (key && selectedProvider) {
      try {
        const res = await api.fetchModels(selectedProvider, key);
        setModels(res.models);
        if (res.models.length > 0) setSelectedModel(res.models[0]);
      } catch (e) {
        // Ignore - may be invalid key
      }
    }
  }, [selectedProvider]);

  // ─── Polling Cleanup ─────────────────────────────────────────────────
  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => clearPolling, [clearPolling]);

  // ─── Start Generation ────────────────────────────────────────────────
  const startGeneration = useCallback(async () => {
    if (!prompt.trim() || !apiKey.trim()) {
      setError("Prompt and API key are required");
      return;
    }
    clearPolling();
    setLoading(true);
    setError(null);
    setKeyError(null);
    setJobStatus(null);

    try {
      const res = await api.generate({
        prompt,
        provider: selectedProvider as any,
        model: selectedModel || undefined,
        api_key: apiKey,
        cad_format: cadFormat,
        run_meshing: runMeshing,
        run_optimization: runOptimization,
      });

      // Try WebSocket first
      const wsUrl = api.wsUrl(res.job_id);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const status = JSON.parse(event.data) as JobStatus;
          setJobStatus(status);
          if (status.status === "completed" || status.status === "failed") {
            setLoading(false);
            clearPolling();
          }
        } catch {}
      };
      ws.onerror = () => {
        ws.close();
        pollJob(res.job_id);
      };
      ws.onclose = () => {
        if (jobStatus?.status !== "completed" && jobStatus?.status !== "failed") {
          pollJob(res.job_id);
        }
      };
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("401")) setKeyError("Invalid API key");
      else setError("Generation failed: " + msg);
      setLoading(false);
    }
  }, [prompt, apiKey, selectedProvider, selectedModel, cadFormat, runMeshing, runOptimization, jobStatus, clearPolling]);

  // ─── Polling Fallback ────────────────────────────────────────────────
  const pollJob = useCallback(async (jobId: string) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await api.getJob(jobId);
        setJobStatus(status);
        if (status.status === "completed" || status.status === "failed") {
          setLoading(false);
          clearPolling();
        }
      } catch {
        clearPolling();
        setLoading(false);
      }
    }, 1500);
  }, [clearPolling]);

  // ─── Provider/Model Options ──────────────────────────────────────────
  const providerOptions = providers.map((p) => ({
    value: p.id,
    label: `${p.name} ${p.supports_cad ? "✓ CAD" : ""}`,
  }));
  const modelOptions = models.map((m) => ({ value: m, label: m }));
  const formatOptions = [
    { value: "step", label: "STEP (.step)" },
    { value: "stl", label: "STL (.stl)" },
    { value: "brep", label: "BREP (.brep)" },
  ];

  // ─── Selected Provider Info ──────────────────────────────────────────
  const currentProvider = providers.find((p) => p.id === selectedProvider);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>AI Generate — Live Backend Connected</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            AI Generate
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Describe a part in natural language → LLM writes CadQuery code → CAD → Mesh → Optimize
          </p>
        </div>

        {/* Error Banner */}
        {(error || keyError) && (
          <div className="relative flex items-start gap-3 p-4 rounded-xl bg-red-900/30 border border-red-500/30 animate-slide-in">
            <div className="flex-shrink-0 w-6 h-6 text-red-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="flex-1 text-red-200 text-sm">
              {keyError || error}
              <button
                onClick={() => { setError(null); setKeyError(null); }}
                className="ml-2 underline hover:text-red-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Provider & Model */}
        <GlassCard className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 17h8" />
                <path d="M12 11v6" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Provider & Model</h3>
              <p className="text-gray-500 text-sm">Select your LLM provider and enter API key</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FloatingSelect
              label="Provider"
              value={selectedProvider}
              onChange={handleProviderChange}
              options={providerOptions}
              placeholder="Select provider"
              error={providerError || undefined}
              disabled={loading}
            />
            <FloatingSelect
              label="Model"
              value={selectedModel}
              onChange={(value: string) => setSelectedModel(value)}
              options={modelOptions}
              placeholder="Enter API key first"
              disabled={models.length === 0 || loading}
            />
            <FloatingInput
              label="API Key"
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="Paste your API key"
              error={keyError || undefined}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}
              disabled={loading}
            />
          </div>

          {/* Provider Info Badge */}
          {currentProvider && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <span className="text-sm text-gray-400">Active:</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {currentProvider.name} — {currentProvider.default_model}
              </span>
              <span className="ml-auto px-2 py-1 rounded text-xs text-green-400 bg-green-500/10">
                ✓ CAD Generation Supported
              </span>
            </div>
          )}
        </GlassCard>

        {/* Step 2: Prompt Input */}
        <GlassCard className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L21 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Describe Your Part</h3>
              <p className="text-gray-500 text-sm">Be specific — dimensions, features, materials</p>
            </div>
          </div>

          <FloatingInput
            label="Prompt"
            type="text"
            value={prompt}
            onChange={setPrompt}
            placeholder="e.g. A turbine blade with 12 curved airfoils, 50mm chord, 200mm span, 2mm trailing edge thickness, root fillet radius 5mm"
            disabled={loading}
            error={!prompt.trim() && loading ? "Prompt is required" : undefined}
            multiline
            rows={4}
            className="resize-none"
          />

          {/* Options Row */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={runMeshing}
                onChange={(e) => setRunMeshing(e.target.checked)}
                disabled={loading}
                className="w-5 h-5 rounded border-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-colors"
              />
              <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                Generate Mesh <span className="text-gray-500">(Gmsh)</span>
              </span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={runOptimization}
                onChange={(e) => setRunOptimization(e.target.checked)}
                disabled={loading}
                className="w-5 h-5 rounded border-gray-700 text-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-colors"
              />
              <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                Run Optimization <span className="text-gray-500">(Nevergrad)</span>
              </span>
            </label>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-gray-500 text-sm">Format:</span>
              <select
                value={cadFormat}
                onChange={(e) => setCadFormat(e.target.value as any)}
                disabled={loading}
                className="px-3 py-2 rounded-lg bg-gray-900/80 border border-gray-700 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
              >
                {formatOptions.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={startGeneration}
            disabled={loading || !prompt.trim() || !apiKey.trim()}
            className={`
              mt-6 w-full py-4 px-6 rounded-xl font-semibold text-lg text-white
              transition-all duration-300
              ${loading
                ? "bg-gradient-to-r from-blue-600 to-blue-700 cursor-wait"
                : !prompt.trim() || !apiKey.trim()
                ? "bg-gray-700 cursor-not-allowed opacity-50"
                : "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 shadow-lg shadow-blue-500/25"
              }
              flex items-center justify-center gap-3
            `}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                <span>Generating CAD...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                <span>Generate CAD</span>
              </>
            )}
          </button>
        </GlassCard>

        {/* Step 3: Local CAD Import */}
        <GlassCard className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Import Local CAD</h3>
              <p className="text-gray-500 text-sm">Upload existing STEP/STL/BREP files</p>
            </div>
          </div>
          <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors relative overflow-hidden group">
            <input
              type="file"
              accept=".step,.stp,.stl,.brep"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setError("Local file import requires Tauri dialog. Use Generate tab for now.");
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gray-800/50 flex items-center justify-center text-gray-500 group-hover:text-blue-400 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              <p className="text-gray-300">Drag & drop or click to upload</p>
              <p className="text-gray-500 text-sm">.step, .stp, .stl, .brep</p>
            </div>
          </div>
        </GlassCard>

        {/* Job Status */}
        {jobStatus && (
          <GlassCard className="animate-slide-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  {jobStatus.status === "generating" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 17h8" />
                      <path d="M12 11v6" />
                    </svg>
                  )}
                  {jobStatus.status === "meshing" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16v16H4z" />
                      <path d="M4 12h16" />
                      <path d="M12 4v16" />
                    </svg>
                  )}
                  {jobStatus.status === "optimizing" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  )}
                  {jobStatus.status === "completed" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  )}
                  {jobStatus.status === "failed" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  )}
                  {jobStatus.status === "pending" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Job Status</h3>
                  <p className="text-gray-500 text-sm">Job ID: {jobStatus.job_id}</p>
                </div>
              </div>
              <StatusBadge status={jobStatus.status} />
            </div>

            {/* Progress Ring + Bar */}
            <div className="flex items-center gap-6 mb-6">
              <ProgressRing progress={jobStatus.progress} size={80} stroke={8} />
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">{jobStatus.message}</span>
                  <span className="font-mono text-white">{jobStatus.progress}%</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Artifacts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {jobStatus.cad_path && (
                <ArtifactCard
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L21 7" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                  }
                  label="CAD Model"
                  path={jobStatus.cad_path}
                  color="blue"
                />
              )}
              {jobStatus.mesh_path && (
                <ArtifactCard
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16v16H4z" />
                      <path d="M4 12h16" />
                      <path d="M12 4v16" />
                    </svg>
                  }
                  label="Mesh"
                  path={jobStatus.mesh_path}
                  color="amber"
                />
              )}
              {jobStatus.optimization_result && (
                <ArtifactCard
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  }
                  label="Optimization"
                  path={`${JSON.stringify(jobStatus.optimization_result).slice(0, 50)}...`}
                  color="purple"
                />
              )}
            </div>

            {/* Error */}
            {jobStatus.error && (
              <div className="mt-6 p-4 rounded-xl bg-red-900/30 border border-red-500/30">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 text-red-400 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="flex-1 text-red-200 text-sm">
                    <strong>Error:</strong> {jobStatus.error}
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm pt-8 border-t border-gray-800">
          <p>CFD Platform — AI Generate | BYOK: Google • OpenAI • NVIDIA NIM • Groq</p>
          <p className="mt-1">CadQuery → Gmsh → Nevergrad Pipeline</p>
        </div>
      </div>
    </div>
  );
}

// ─── Artifact Card ──────────────────────────────────────────────────────
function ArtifactCard({ icon, label, path, color }: { icon: React.ReactNode; label: string; path: string; color: "blue" | "amber" | "purple" }) {
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