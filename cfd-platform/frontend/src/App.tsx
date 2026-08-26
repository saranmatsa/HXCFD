import { useEffect, useState, useCallback } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import WorkflowModule from "./components/WorkflowModule";
import { AIGenerateTab } from "./components/AIGenerateTab";
import {
  archiveLocalProject,
  checkBackendHealth,
  configureWorkflowStage,
  createLocalProject,
  deleteLocalProject,
  executeWorkflowStage,
  exportWorkflowArtifact,
  getBackendStatus,
  getEngineInventory,
  getWorkflowSnapshot,
  listLocalProjects,
  openLocalProject,
  renameLocalProject,
  readWorkflowArtifact,
  startBackend,
  type EngineCapability,
  type LocalProject,
  type WorkflowArtifact,
  type WorkflowArtifactContent,
  type WorkflowExecution,
  type WorkflowSnapshot,
} from "./services/desktopWorkflow";

type AppScreen = "workflow" | "projects" | "settings" | "ai-generate";
type BackendReadiness = "checking" | "starting" | "ready" | "offline";

type StageId = 'geometry' | 'meshing' | 'physics' | 'solver' | 'results' | 'reports' | 'optimization' | 'surrogate';

const stageNavigation = [
  { id: 'geometry', label: 'Geometry', icon: 'import' },
  { id: 'meshing', label: 'Meshing', icon: 'mesh' },
  { id: 'physics', label: 'Physics', icon: 'setup' },
  { id: 'solver', label: 'Solver', icon: 'simulate' },
  { id: 'results', label: 'Results', icon: 'analyze' },
  { id: 'reports', label: 'Reports', icon: 'export' },
  { id: 'optimization', label: 'Optimization', icon: 'optimize', dividerBefore: true },
  { id: 'surrogate', label: 'Surrogate', icon: 'optimize' },
  { id: 'settings', label: 'Settings', icon: 'settings', dividerBefore: true },
] as const;

type NavItem = typeof stageNavigation[number];

const iconPaths: Record<string, React.ReactNode> = {
  import: <><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5" /><path d="M5 13v6h14v-6" /></>,
  mesh: <path d="M4 5h16M4 12h16M4 19h16M7 3l3 18M17 3l-3 18" />,
  setup: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.05 2.05-.06-.06A1.7 1.7 0 0 0 15.8 18.6a1.7 1.7 0 0 0-1 1.55v.1h-2.9v-.1a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.05-2.05.06-.06A1.7 1.7 0 0 0 7.3 15a1.7 1.7 0 0 0-1.55-1H5.6v-2.9h.15a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06L8.95 6.1l.06.06A1.7 1.7 0 0 0 10.9 6.5a1.7 1.7 0 0 0 1-1.55v-.1h2.9v.1a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.05 2.05-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1h.1V14h-.1a1.7 1.7 0 0 0-1.54 1Z" /></>,
  simulate: <><path d="M5 5h5v5H5zM14 14h5v5h-5zM7.5 10v2a2 2 0 0 0 2 2H14" /><path d="m12 17 2 2 2-2" /></>,
  analyze: <><path d="M4 20V4M4 20h17" /><path d="m7 15 4-4 3 2 5-7" /></>,
  export: <><path d="M6 3h9l3 3v15H6zM14 3v4h4" /><path d="M9 12h6m-6 4h6" /></>,
  optimize: <><path d="M4 19 9 13l3 3 7-10" /><path d="M15 6h4v4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4" /></>,
  projects: <><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2.5h6.5A2.5 2.5 0 0 1 21 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /><path d="M3 9h18" /></>,
  ai: <><path d="M12 2.8 13.9 9l6.3 1.9-6.3 1.9L12 19l-1.9-6.2-6.3-1.9L10.1 9 12 2.8Z" /></>,
  spark: <path d="M12 2.8 13.9 9l6.3 1.9-6.3 1.9L12 19l-1.9-6.2-6.3-1.9L10.1 9 12 2.8Z" />,
  warning: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  play: <path d="m9 5 10 7-10 7z" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  folder: <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />,
};

const Icon = ({ name, size = 16 }: { name: string; size?: number }) => (
  <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {iconPaths[name]}
  </svg>
);

const IconButton = ({ icon, label, onClick, disabled, className = "" }: { 
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

function App() {
  const [screen, setScreen] = useState<AppScreen>("workflow");
  const [activeStage, setActiveStage] = useState<StageId>("geometry");
  const [backendReady, setBackendReady] = useState<BackendReadiness>("checking");
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot | null>(null);
  const [engines, setEngines] = useState<EngineCapability[]>([]);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [currentProject, setCurrentProject] = useState<string>("aero-turbine-study");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load backend status on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const status = await getBackendStatus();
        setBackendReady(status === "running" ? "ready" : "offline");
        if (status !== "running") {
          await startBackend();
          setBackendReady("starting");
          // Poll until ready
          const interval = setInterval(async () => {
            const s = await getBackendStatus();
            if (s === "running") {
              setBackendReady("ready");
              clearInterval(interval);
              loadInitialData();
            }
          }, 1000);
        } else {
          loadInitialData();
        }
      } catch {
        setBackendReady("offline");
      }
    };
    checkBackend();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [snap, eng, projs] = await Promise.all([
        getWorkflowSnapshot(currentProject, true),
        getEngineInventory(),
        listLocalProjects(false),
      ]);
      setSnapshot(snap);
      setEngines(eng);
      setProjects(projs);
      
      // If no project exists, create default
      if (projs.length === 0) {
        await createLocalProject(currentProject);
        const newSnap = await getWorkflowSnapshot(currentProject, true);
        setSnapshot(newSnap);
        const newProjs = await listLocalProjects(false);
        setProjects(newProjs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const refreshSnapshot = useCallback(async () => {
    try {
      const snap = await getWorkflowSnapshot(currentProject, true);
      setSnapshot(snap);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [currentProject]);

  const handleConfigure = async (stageId: StageId, config: Record<string, string>) => {
    await configureWorkflowStage(currentProject, stageId, { fields: config, source: 'hx-cfd-desktop' });
  };

  const handleExecute = async (stageId: StageId, config: Record<string, string>) => {
    await executeWorkflowStage(stageId, config);
  };

  const handleProjectChange = async (projectId: string) => {
    if (projectId === currentProject) return;
    setCurrentProject(projectId);
    await openLocalProject(projectId);
    await refreshSnapshot();
  };

  const handleNewProject = async () => {
    const name = prompt("Enter new project name:");
    if (!name) return;
    const projectId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    try {
      await createLocalProject(projectId);
      const newProjs = await listLocalProjects(false);
      setProjects(newProjs);
      setCurrentProject(projectId);
      await refreshSnapshot();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm(`Delete project "${projectId}"? This cannot be undone.`)) return;
    try {
      await deleteLocalProject(projectId);
      const newProjs = await listLocalProjects(false);
      setProjects(newProjs);
      if (projectId === currentProject) {
        const first = newProjs[0]?.project_id || "aero-turbine-study";
        setCurrentProject(first);
        await refreshSnapshot();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  const getStageStatus = (stageId: StageId): 'blocked' | 'required' | 'configured' | 'running' | 'succeeded' | 'failed' => {
    if (!snapshot) return 'blocked';
    
    const stage = snapshot.stages.find(s => s.id === stageId);
    if (!stage) return 'blocked';
    
    // Check job state
    const job = snapshot.jobs.find(j => j.stage === stageId) as Record<string, unknown> | undefined;
    if (job) {
      const state = job.state as string;
      if (state === 'RUNNING' || state === 'STAGING' || state === 'VALIDATING' || state === 'PUBLISHING') return 'running';
      if (state === 'SUCCEEDED') return 'succeeded';
      if (state === 'FAILED') return 'failed';
    }
    
    // Check prerequisites
    const stageIndex = stageNavigation.findIndex(n => n.id === stageId);
    for (let i = 0; i < stageIndex; i++) {
      const prereq = stageNavigation[i].id as StageId;
      const prereqStage = snapshot.stages.find(s => s.id === prereq);
      if (!prereqStage || prereqStage.status !== 'configured') {
        return 'blocked';
      }
    }
    
    return stage.status === 'configured' ? 'configured' : 'required';
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Initializing HX CFD...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="top-bar-left">
          <IconButton icon="menu" label="Menu" onClick={() => setScreen("projects")} />
          <div className="project-selector">
            <Icon name="folder" size={14} />
            <select 
              value={currentProject} 
              onChange={e => handleProjectChange(e.target.value)}
              className="project-select"
            >
              {projects.map(p => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_id}{p.archived && ' (archived)'}
                </option>
              ))}
            </select>
            <IconButton icon="plus" label="New Project" onClick={handleNewProject} className="ml-2" />
          </div>
        </div>
        
        <div className="top-bar-center">
          <div className="stage-tabs">
            {stageNavigation.map((item: NavItem) => {
              const status = item.id !== 'settings' ? getStageStatus(item.id as StageId) : 'configured';
              const isActive = item.id === (screen === 'workflow' ? activeStage : screen);
              const statusColors: Record<string, string> = {
                blocked: 'tab-blocked',
                required: 'tab-required',
                configured: 'tab-configured',
                running: 'tab-running',
                succeeded: 'tab-succeeded',
                failed: 'tab-failed',
              };
              return (
                <button
                  key={item.id}
                  className={`stage-tab ${statusColors[status]} ${isActive ? 'active' : ''} ${item.dividerBefore ? 'divider-before' : ''}`}
                  onClick={() => {
                    if (item.id === 'settings') {
                      setScreen('settings');
                    } else {
                      setScreen('workflow');
                      setActiveStage(item.id as StageId);
                    }
                  }}
                  disabled={status === 'blocked'}
                  title={`${item.label} - ${status}`}
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                  {status === 'running' && <span className="running-indicator" />}
                  {status === 'succeeded' && <Icon name="check" size={12} className="success-mark" />}
                  {status === 'failed' && <Icon name="warning" size={12} className="error-mark" />}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="top-bar-right">
          <div className="backend-status">
            <span className={`status-dot ${backendReady}`} />
            <span className="status-text">{backendReady === 'ready' ? 'Backend Ready' : backendReady === 'starting' ? 'Starting...' : 'Offline'}</span>
          </div>
          <IconButton icon="bell" label="Notifications" />
          <IconButton icon="settings" label="Settings" onClick={() => setScreen('settings')} />
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {screen === 'workflow' && snapshot && (
          <WorkflowModule
            stageId={activeStage}
            snapshot={snapshot}
            onRefresh={refreshSnapshot}
            onExecute={handleExecute}
            onConfigure={handleConfigure}
          />
        )}
        
        {screen === 'projects' && (
          <ProjectsView 
            projects={projects}
            currentProject={currentProject}
            onSelect={handleProjectChange}
            onNew={handleNewProject}
            onDelete={handleDeleteProject}
          />
        )}
        
        {screen === 'settings' && (
          <SettingsView 
            engines={engines}
            backendReady={backendReady}
            onRefreshEngines={async () => {
              const eng = await getEngineInventory();
              setEngines(eng);
            }}
          />
        )}
        
        {screen === 'ai-generate' && (
          <AIGenerateTab />
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="bottom-bar">
        <div className="bottom-left">
          <span className="version">HX CFD v1.0.0</span>
          <span className="separator">|</span>
          <span className="project-path">Project: {currentProject}</span>
        </div>
        <div className="bottom-center">
          {snapshot && snapshot.jobs.length > 0 && (
            <div className="active-jobs">
              {snapshot.jobs
                .filter(j => ['RUNNING', 'STAGING', 'VALIDATING', 'PUBLISHING'].includes((j as any).state))
                .map((job: any) => (
                  <span key={job.id} className="job-indicator">
                    <span className="pulse" /> {job.stage}: {(job as any).state}
                  </span>
                ))}
            </div>
          )}
        </div>
        <div className="bottom-right">
          <span className="system-info">Local-first • Offline-capable</span>
        </div>
      </footer>

      {error && (
        <div className="error-toast">
          <Icon name="warning" size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
    </div>
  );
}

function ProjectsView({ projects, currentProject, onSelect, onNew, onDelete }: {
  projects: LocalProject[];
  currentProject: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="projects-view">
      <div className="projects-header">
        <h1>Projects</h1>
        <button className="primary-btn" onClick={onNew}>
          <Icon name="plus" size={16} /> New Project
        </button>
      </div>
      <div className="projects-grid">
        {projects.length === 0 ? (
          <div className="empty-projects">
            <Icon name="folder" size={48} />
            <h3>No projects yet</h3>
            <p>Create your first CFD project to get started</p>
            <button className="primary-btn" onClick={onNew}>
              <Icon name="plus" size={16} /> Create Project
            </button>
          </div>
        ) : (
          projects.map(project => (
            <div key={project.project_id} className={`project-card ${project.project_id === currentProject ? 'active' : ''}`}>
              <div className="project-info">
                <Icon name="folder" size={24} />
                <div>
                  <h4>{project.project_id}</h4>
                  <small>Updated {new Date(project.updated_at).toLocaleDateString()}</small>
                  {project.archived && <span className="archived-badge">Archived</span>}
                </div>
              </div>
              <div className="project-actions">
                <IconButton 
                  icon={project.project_id === currentProject ? 'check' : 'folder'} 
                  label={project.project_id === currentProject ? 'Current' : 'Open'}
                  onClick={() => onSelect(project.project_id)}
                  disabled={project.project_id === currentProject}
                />
                <IconButton 
                  icon="archive" 
                  label="Archive"
                  onClick={() => {}}
                />
                <IconButton 
                  icon="trash" 
                  label="Delete"
                  onClick={() => onDelete(project.project_id)}
                  className="delete-btn"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SettingsView({ engines, backendReady, onRefreshEngines }: {
  engines: EngineCapability[];
  backendReady: BackendReadiness;
  onRefreshEngines: () => void;
}) {
  const [tab, setTab] = useState<'general' | 'engines'>('general');
  
  return (
    <div className="settings-view">
      <div className="settings-header">
        <h1>Settings</h1>
      </div>
      <div className="settings-layout">
        <aside className="settings-tabs">
          <button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>
            <Icon name="gear" size={16} /> General
          </button>
          <button className={tab === 'engines' ? 'active' : ''} onClick={() => setTab('engines')}>
            <Icon name="cpu" size={16} /> Engines
          </button>
        </aside>
        <main className="settings-content">
          {tab === 'general' && (
            <div className="settings-section">
              <h3>General</h3>
              <div className="setting-row">
                <label>Backend Status</label>
                <div className="status-display">
                  <span className={`status-dot ${backendReady}`} />
                  <span>{backendReady === 'ready' ? 'Running' : backendReady === 'starting' ? 'Starting...' : 'Stopped'}</span>
                </div>
              </div>
              <div className="setting-row">
                <label>Project Storage</label>
                <span className="setting-value">{typeof window !== 'undefined' ? 'Documents/HX CFD Projects' : 'Local'}</span>
              </div>
              <div className="setting-row">
                <button className="secondary-btn" onClick={onRefreshEngines}>
                  <Icon name="spark" size={14} /> Refresh Engine Status
                </button>
              </div>
            </div>
          )}
          
          {tab === 'engines' && (
            <div className="settings-section">
              <h3>Local Engineering Engines</h3>
              <p className="setting-hint">These are the 14 implementation engines managed by HX CFD. They are not shown in the workflow UI.</p>
              <div className="engines-table">
                <table>
                  <thead>
                    <tr>
                      <th>Engine</th>
                      <th>Status</th>
                      <th>Version</th>
                      <th>Workflow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engines.map(engine => (
                      <tr key={engine.id}>
                        <td>{engine.display_name}</td>
                        <td>
                          <span className={`engine-status ${engine.status}`}>
                            {engine.status === 'ready' || engine.status === 'bundled' ? 'Ready' : 'Unavailable'}
                          </span>
                        </td>
                        <td>{engine.version || '—'}</td>
                        <td>{engine.workflow.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;