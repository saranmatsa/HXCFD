import { useEffect, useState, useCallback } from 'react';
import { Icon, IconButton, FloatingInput } from './ui/SharedUI';
import {
  getWorkflowSnapshot,
  configureWorkflowStage,
  executeWorkflowStage,
  createLocalProject,
  openLocalProject,
  listLocalProjects,
  listWorkflowArtifacts,
  readWorkflowArtifact,
  exportWorkflowArtifact,
  type WorkflowSnapshot,
  type WorkflowExecution,
  type EngineCapability,
} from '../services/desktopWorkflow';
import { Viewport3D } from '../components/viewport/Viewport3D';

type StageId = 'geometry' | 'meshing' | 'physics' | 'solver' | 'results' | 'reports' | 'optimization' | 'surrogate';

interface StageConfig {
  id: StageId;
  label: string;
  icon: string;
  title: string;
  description: string;
  essentials: FieldConfig[];
  advanced: FieldConfig[];
  nextStage: StageId;
  prerequisiteStages: StageId[];
}

interface FieldConfig {
  label: string;
  type: 'text' | 'select' | 'number' | 'file' | 'vector3';
  value: string;
  options?: string[];
  unit?: string;
  placeholder?: string;
  required?: boolean;
}

interface Project {
  id: string;
  project_id: string;
  created_at?: string;
  updated_at: string;
  archived: boolean;
}

const stageConfigs: Record<StageId, StageConfig> = {
  geometry: {
    id: 'geometry',
    label: 'Geometry',
    icon: 'import',
    title: 'Import and Prepare Geometry',
    description: 'Import CAD files (STEP, IGES, BREP) or surface meshes (STL, OBJ). HX CFD validates, repairs, and exports a simulation-ready geometry.',
    prerequisiteStages: [],
    essentials: [
      { label: 'Source File', type: 'file', value: '', placeholder: 'Select STEP, IGES, BREP, STL, or OBJ file', required: true },
      { label: 'Units', type: 'select', value: 'Millimeters', options: ['Millimeters', 'Meters', 'Inches'], required: true },
    ],
    advanced: [
      { label: 'Defeature Tolerance', type: 'number', value: '0.1', unit: 'mm', placeholder: '0.1' },
      { label: 'Repair Mode', type: 'select', value: 'Conservative', options: ['Conservative', 'Aggressive', 'None'] },
      { label: 'Merge Tolerance', type: 'number', value: '1e-6', unit: 'mm', placeholder: '1e-6' },
    ],
    nextStage: 'meshing',
  },
  meshing: {
    id: 'meshing',
    label: 'Meshing',
    icon: 'mesh',
    title: 'Generate Computational Mesh',
    description: 'Create volume mesh using Gmsh (Route A) or snappyHexMesh (Route B). Configure boundary layers, sizing, and quality thresholds.',
    prerequisiteStages: ['geometry'],
    essentials: [
      { label: 'Mesh Route', type: 'select', value: 'Route A (Gmsh)', options: ['Route A (Gmsh)', 'Route B (snappyHexMesh)'], required: true },
      { label: 'Base Size', type: 'number', value: '1.0', unit: 'mm', required: true },
      { label: 'Boundary Layers', type: 'number', value: '10', unit: 'layers', required: true },
    ],
    advanced: [
      { label: 'Growth Rate', type: 'number', value: '1.18', placeholder: '1.18' },
      { label: 'Min Size Factor', type: 'number', value: '0.25', placeholder: '0.25' },
      { label: 'Quality Threshold (scaled Jacobian)', type: 'number', value: '0.2', placeholder: '0.2' },
      { label: 'Unassigned Surfaces', type: 'select', value: 'unassigned', options: ['unassigned', 'walls'] },
    ],
    nextStage: 'physics',
  },
  physics: {
    id: 'physics',
    label: 'Physics',
    icon: 'setup',
    title: 'Configure Physics and Boundary Conditions',
    description: 'Define fluid properties, turbulence model, and boundary conditions. Map mesh patches to CFD roles (inlet, outlet, wall, symmetry).',
    prerequisiteStages: ['meshing'],
    essentials: [
      { label: 'Fluid', type: 'select', value: 'Air (ideal gas)', options: ['Air (ideal gas)', 'Water (liquid)'], required: true },
      { label: 'Turbulence Model', type: 'select', value: 'k-ω SST', options: ['k-ω SST', 'k-ε Realizable', 'Spalart-Allmaras'], required: true },
      { label: 'Reference Pressure', type: 'number', value: '101325', unit: 'Pa', required: true },
    ],
    advanced: [
      { label: 'Energy Equation', type: 'select', value: 'Disabled', options: ['Disabled', 'Enabled'] },
      { label: 'Solver Type', type: 'select', value: 'Steady RANS', options: ['Steady RANS', 'Transient RANS'] },
      { label: 'Inlet Velocity', type: 'vector3', value: '10, 0, 0', unit: 'm/s', placeholder: '10, 0, 0' },
      { label: 'Turbulence Intensity', type: 'number', value: '0.05', placeholder: '0.05' },
      { label: 'Turbulence Length Scale', type: 'number', value: '0.01', unit: 'm', placeholder: '0.01' },
    ],
    nextStage: 'solver',
  },
  solver: {
    id: 'solver',
    label: 'Solver',
    icon: 'simulate',
    title: 'Run CFD Simulation',
    description: 'Execute OpenFOAM solver with monitored residuals. Configure convergence criteria, parallel execution, and output intervals.',
    prerequisiteStages: ['physics'],
    essentials: [
      { label: 'Run Type', type: 'select', value: 'Steady flow', options: ['Steady flow', 'Transient flow'], required: true },
      { label: 'Max Iterations', type: 'number', value: '5000', required: true },
      { label: 'Residual Target', type: 'number', value: '1e-5', placeholder: '1e-5', required: true },
    ],
    advanced: [
      { label: 'Parallel Processes', type: 'number', value: '4', unit: 'cores', placeholder: '4' },
      { label: 'Write Interval', type: 'number', value: '100', unit: 'iterations', placeholder: '100' },
      { label: 'Decomposition Method', type: 'select', value: 'scotch', options: ['scotch', 'simple', 'hierarchical'] },
      { label: 'Non-orthogonal Correctors', type: 'number', value: '0', placeholder: '0' },
    ],
    nextStage: 'results',
  },
  results: {
    id: 'results',
    label: 'Results',
    icon: 'analyze',
    title: 'Analyze and Visualize Results',
    description: 'View scalar/vector fields, contours, streamlines, and probes. Export derived data and generate reports.',
    prerequisiteStages: ['solver'],
    essentials: [
      { label: 'Field to Visualize', type: 'select', value: 'Velocity', options: ['Velocity', 'Pressure', 'Temperature', 'Turbulent Kinetic Energy', 'Vorticity'], required: true },
      { label: 'Visualization Type', type: 'select', value: 'Contour', options: ['Contour', 'Streamlines', 'Slice Plane', 'Vector Glyphs'], required: true },
    ],
    advanced: [
      { label: 'Slice Plane', type: 'vector3', value: '0, 0, 0', unit: 'm', placeholder: '0, 0, 0' },
      { label: 'Slice Normal', type: 'vector3', value: '0, 0, 1', placeholder: '0, 0, 1' },
      { label: 'Streamline Seed', type: 'vector3', value: '-5, 0, 0', unit: 'm', placeholder: '-5, 0, 0' },
      { label: 'Colormap', type: 'select', value: 'viridis', options: ['viridis', 'jet', 'plasma', 'inferno', 'coolwarm'] },
    ],
    nextStage: 'reports',
  },
  reports: {
    id: 'reports',
    label: 'Reports',
    icon: 'export',
    title: 'Generate Engineering Reports',
    description: 'Create PDF/HTML reports from verified results. Include geometry, mesh quality, solver setup, and result visualizations.',
    prerequisiteStages: ['results'],
    essentials: [
      { label: 'Report Template', type: 'select', value: 'Engineering review', options: ['Engineering review', 'Performance summary'], required: true },
    ],
    advanced: [
      { label: 'Format', type: 'select', value: 'PDF', options: ['PDF', 'HTML'] },
      { label: 'Include Mesh Diagnostics', type: 'select', value: 'true', options: ['true', 'false'] },
      { label: 'Include Convergence History', type: 'select', value: 'true', options: ['true', 'false'] },
    ],
    nextStage: 'reports',
  },
  optimization: {
    id: 'optimization',
    label: 'Optimization',
    icon: 'optimize',
    title: 'Design Optimization',
    description: 'Run parameter sweeps and goal-seeking studies using OpenMDAO + Nevergrad. Requires a project evaluator module.',
    prerequisiteStages: ['solver'],
    essentials: [
      { label: 'Evaluator Module', type: 'file', value: '', placeholder: 'Path to Python evaluator with evaluate(design) function', required: true },
      { label: 'Design Variable', type: 'text', value: 'scale', placeholder: 'scale', required: true },
      { label: 'Lower Bound', type: 'number', value: '0.8', required: true },
      { label: 'Upper Bound', type: 'number', value: '1.2', required: true },
      { label: 'Budget (evaluations)', type: 'number', value: '20', required: true },
    ],
    advanced: [
      { label: 'Optimization Strategy', type: 'select', value: 'OnePlusOne', options: ['OnePlusOne', 'CMA-ES', 'DE', 'PSO'] },
      { label: 'Parallel Evaluations', type: 'number', value: '1', unit: 'workers', placeholder: '1' },
    ],
    nextStage: 'optimization',
  },
  surrogate: {
    id: 'surrogate',
    label: 'Surrogate Assist',
    icon: 'optimize',
    title: 'ML Surrogate Training',
    description: 'Train PhysicsNeMo surrogate models on validated CFD datasets for accelerated optimization.',
    prerequisiteStages: ['results'],
    essentials: [
      { label: 'Training Module', type: 'file', value: '', placeholder: 'Path to PhysicsNeMo training script', required: true },
      { label: 'Dataset Path', type: 'file', value: '', placeholder: 'Path to labelled CFD dataset', required: true },
    ],
    advanced: [
      { label: 'Model Architecture', type: 'select', value: 'FNO', options: ['FNO', 'DeepONet', 'GraphCast'] },
      { label: 'Epochs', type: 'number', value: '100', placeholder: '100' },
      { label: 'Batch Size', type: 'number', value: '32', placeholder: '32' },
    ],
    nextStage: 'surrogate',
  },
};

const stageOrder: StageId[] = ['geometry', 'meshing', 'physics', 'solver', 'results', 'reports', 'optimization', 'surrogate'];

function getStageStatus(snapshot: WorkflowSnapshot | null, stageId: StageId): 'blocked' | 'required' | 'configured' | 'running' | 'succeeded' | 'failed' {
  if (!snapshot) return 'blocked';
  
  const stage = snapshot.stages.find(s => s.id === stageId);
  if (!stage) return 'blocked';
  
  // Check prerequisites
  const config = stageConfigs[stageId];
  for (const prereq of config.prerequisiteStages) {
    const prereqStage = snapshot.stages.find(s => s.id === prereq);
    if (!prereqStage || prereqStage.status !== 'configured') {
      return 'blocked';
    }
  }
  
  // Check job state
  const job = snapshot.jobs.find(j => j.stage === stageId) as Record<string, unknown> | undefined;
  if (job) {
    const state = job.state as string;
    if (state === 'RUNNING' || state === 'STAGING' || state === 'VALIDATING' || state === 'PUBLISHING') return 'running';
    if (state === 'SUCCEEDED') return 'succeeded';
    if (state === 'FAILED') return 'failed';
  }
  
  return stage.status === 'configured' ? 'configured' : 'required';
}

function WorkflowModule({ 
  stageId, 
  snapshot, 
  onRefresh,
  onExecute,
  onConfigure 
}: { 
  stageId: StageId; 
  snapshot: WorkflowSnapshot | null; 
  onRefresh: () => void;
  onExecute: (stageId: StageId, config: Record<string, string>) => Promise<void>;
  onConfigure: (stageId: StageId, config: Record<string, string>) => Promise<void>;
}) {
  const config = stageConfigs[stageId];
  const status = getStageStatus(snapshot, stageId);
  const isActive = snapshot?.stages.find(s => s.id === stageId)?.status === 'configured';
  const [values, setValues] = useState<Record<string, string>>(() => {
    const defaults = Object.fromEntries([...config.essentials, ...config.advanced].map(f => [f.label, f.value]));
    const stored = snapshot?.stages.find(s => s.id === stageId)?.configuration?.fields;
    if (stored && typeof stored === 'object') {
      return { ...defaults, ...Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, String(v)])) };
    }
    return defaults;
  });
  const [advanced, setAdvanced] = useState(false);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [localStatus, setLocalStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const stored = snapshot?.stages.find(s => s.id === stageId)?.configuration?.fields;
    if (stored && typeof stored === 'object') {
      setValues(prev => ({ ...prev, ...Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, String(v)])) }));
    }
  }, [snapshot, stageId]);

  const handleExecute = async () => {
    if (status === 'blocked' || status === 'running') return;
    
    setLocalStatus('running');
    setErrorMessage('');
    
    try {
      // First configure
      await onConfigure(stageId, values);
      // Then execute
      await onExecute(stageId, values);
      setLocalStatus('success');
      onRefresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setLocalStatus('error');
    }
  };

  const handleConfigure = async () => {
    try {
      await onConfigure(stageId, values);
      onRefresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const renderField = (field: FieldConfig) => {
    const isVector = field.type === 'vector3';
    const isFile = field.type === 'file';
    
    return (
      <label className="workflow-field" key={field.label}>
        <span>{field.label}{field.required && <span className="text-red-400 ml-1">*</span>}</span>
        {field.type === 'select' ? (
          <select
            value={values[field.label] || ''}
            onChange={e => setValues(prev => ({ ...prev, [field.label]: e.target.value }))}
            className="field-input"
            disabled={status === 'running'}
          >
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : isVector ? (
          <div className="vector-input">
            {['X', 'Y', 'Z'].map((axis, i) => (
              <input
                key={axis}
                type="number"
                step="any"
                placeholder={axis}
                value={values[field.label]?.split(',')[i]?.trim() || ''}
                onChange={e => {
                  const parts = (values[field.label] || '0, 0, 0').split(',').map(p => p.trim());
                  parts[i] = e.target.value;
                  setValues(prev => ({ ...prev, [field.label]: parts.join(', ') }));
                }}
                className="field-input"
                disabled={status === 'running'}
              />
            ))}
            {field.unit && <span className="field-unit">{field.unit}</span>}
          </div>
        ) : isFile ? (
          <div className="file-input">
            <input
              type="text"
              value={values[field.label] || ''}
              onChange={e => setValues(prev => ({ ...prev, [field.label]: e.target.value }))}
              placeholder={field.placeholder}
              className="field-input"
              disabled={status === 'running'}
            />
            <button 
              type="button" 
              className="file-browse-btn"
              onClick={() => {
                // In real implementation, this would open a native file dialog via Tauri
                alert('File dialog would open here via Tauri');
              }}
              disabled={status === 'running'}
            >
              Browse
            </button>
          </div>
        ) : (
          <div className="scalar-input">
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              step={field.type === 'number' ? 'any' : undefined}
              value={values[field.label] || ''}
              onChange={e => setValues(prev => ({ ...prev, [field.label]: e.target.value }))}
              placeholder={field.placeholder}
              className="field-input"
              disabled={status === 'running'}
            />
            {field.unit && <span className="field-unit">{field.unit}</span>}
          </div>
        )}
      </label>
    );
  };

  const statusColors: Record<string, string> = {
    blocked: 'bg-gray-700 text-gray-400',
    required: 'bg-amber-900/50 text-amber-300',
    configured: 'bg-blue-900/50 text-blue-300',
    running: 'bg-blue-900/50 text-blue-300 animate-pulse',
    succeeded: 'bg-green-900/50 text-green-300',
    failed: 'bg-red-900/50 text-red-300',
  };

  const statusLabels: Record<string, string> = {
    blocked: 'BLOCKED',
    required: 'REQUIRED',
    configured: 'CONFIGURED',
    running: 'RUNNING',
    succeeded: 'COMPLETED',
    failed: 'FAILED',
  };

  // Find preview artifact
  const previewArtifact = execution?.output?.artifacts?.find(
    (a: any) => a.mime_type?.startsWith('image/') || a.name?.endsWith('.png') || a.name?.endsWith('.jpg')
  );
  const previewPath = previewArtifact?.artifact_id;

  return (
    <section className="workflow-module">
      <div className="module-header">
        <div className="header-left">
          <span className="module-eyebrow">{config.label.toUpperCase()}</span>
          <h1 className="module-title">{config.title}</h1>
          <p className="module-description">{config.description}</p>
        </div>
        <span className={`status-badge ${statusColors[status]}`}>{statusLabels[status]}</span>
      </div>

      {status === 'blocked' && (
        <div className="blocked-banner">
          <Icon name="warning" size={16} />
          <span>This stage is blocked. Complete prerequisite stages first: {config.prerequisiteStages.map(s => stageConfigs[s].label).join(', ')}</span>
        </div>
      )}

      <div className="module-layout">
        <main className="module-main">
          <div className="panel essentials-panel">
            <div className="panel-header"><span>Essentials</span></div>
            <div className="workflow-fields">
              {config.essentials.length > 0 ? (
                config.essentials.map(renderField)
              ) : (
                <div className="empty-state">
                  <Icon name="analyze" size={24} />
                  <p>No essential fields required.</p>
                </div>
              )}
            </div>
          </div>

          <button 
            className="advanced-toggle" 
            onClick={() => setAdvanced(v => !v)}
            disabled={status === 'running'}
          >
            {advanced ? 'Hide advanced options' : 'Show advanced options'} <Icon name="chevron" size={13} />
          </button>

          {advanced && (
            <div className="panel advanced-panel">
              <div className="panel-header"><span>Advanced Options</span></div>
              <p className="advanced-hint">These controls are saved with this project. Leave them as-is for the recommended workflow.</p>
              <div className="workflow-fields">
                {config.advanced.length > 0 ? (
                  config.advanced.map(renderField)
                ) : (
                  <p>No advanced options for this stage.</p>
                )}
              </div>
            </div>
          )}

          <div className="action-row">
            <button 
              className={`primary-action ${localStatus === 'running' ? 'loading' : ''} ${status === 'blocked' ? 'disabled' : ''}`}
              onClick={handleExecute}
              disabled={status === 'blocked' || localStatus === 'running'}
            >
              <Icon name="play" size={14} />
              {localStatus === 'running' ? 'Working…' : status === 'succeeded' ? 'Re-run' : 'Execute'}
            </button>
            <span className="next-hint">{config.nextStage !== stageId ? `Next: ${stageConfigs[config.nextStage].label}` : 'Final stage'}</span>
          </div>

          {errorMessage && (
            <div className="error-message">
              <Icon name="warning" size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          {localStatus === 'success' && (
            <div className="success-message">
              <Icon name="check" size={14} />
              <span>Stage completed successfully. Artifacts published.</span>
            </div>
          )}
        </main>

        <aside className="module-aside">
          <div className="panel preview-panel">
            <div className="panel-header"><span>Preview</span></div>
            {previewPath ? (
              <Viewport3D previewPath={previewPath} />
            ) : execution ? (
              <div className="artifact-info">
                <h4>Artifacts Generated</h4>
                <ul>
                  {execution.output?.artifacts?.map((a: any) => (
                    <li key={a.artifact_id}>{a.name} ({a.kind})</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="empty-state">
                <Icon name="analyze" size={32} />
                <p>Execute this stage to generate preview artifacts.</p>
              </div>
            )}
          </div>

          {execution?.output?.log_artifact_id && (
            <div className="panel log-panel">
              <div className="panel-header"><span>Execution Log</span></div>
              <pre className="log-content">
                {execution.output.stdout || 'Log available in project artifacts'}
              </pre>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export default WorkflowModule;