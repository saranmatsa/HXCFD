// New simplified API service for the FastAPI backend (port 8000)

const API_BASE = "http://127.0.0.1:8000";

export interface ProviderInfo {
  id: string;
  name: string;
  default_model: string;
  supports_cad: boolean;
}

export interface ProviderListResponse {
  providers: ProviderInfo[];
}

export interface ModelsResponse {
  provider: string;
  models: string[];
}

export interface GenerateRequest {
  prompt: string;
  provider: "google" | "openai" | "nvidia" | "groq";
  model?: string;
  api_key: string;
  cad_format?: "step" | "stl" | "brep";
  run_meshing?: boolean;
  run_optimization?: boolean;
}

export interface LocalCADRequest {
  file_path: string;
  run_meshing?: boolean;
  run_optimization?: boolean;
}

export interface JobStatus {
  job_id: string;
  status: "pending" | "generating" | "meshing" | "optimizing" | "completed" | "failed";
  progress: number;
  message: string;
  cad_path?: string;
  mesh_path?: string;
  optimization_result?: Record<string, unknown>;
  error?: string;
}

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "APIError";
  }
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new APIError(response.status, text || response.statusText);
  }
  return response.json();
}

export const api = {
  // Health check
  health: () => fetchJSON<{ status: string }>(`${API_BASE}/health`),

  // Providers
  listProviders: () => fetchJSON<ProviderListResponse>(`${API_BASE}/providers`),
  fetchModels: (provider: string, apiKey: string) =>
    fetchJSON<ModelsResponse>(`${API_BASE}/providers/${provider}/models`, {
      method: "POST",
      body: JSON.stringify({ [provider]: apiKey }),
    }),

  // Jobs
  generate: (request: GenerateRequest) =>
    fetchJSON<{ job_id: string; status: string }>(`${API_BASE}/generate`, {
      method: "POST",
      body: JSON.stringify(request),
    }),

  localCAD: (request: LocalCADRequest) =>
    fetchJSON<{ job_id: string; status: string }>(`${API_BASE}/local-cad`, {
      method: "POST",
      body: JSON.stringify(request),
    }),

  getJob: (jobId: string) =>
    fetchJSON<JobStatus>(`${API_BASE}/jobs/${jobId}`),

  // WebSocket for real-time updates
  wsUrl: (jobId: string) => `ws://127.0.0.1:8000/ws/${jobId}`,
};

export type { APIError };