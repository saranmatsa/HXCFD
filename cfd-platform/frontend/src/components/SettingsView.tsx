import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  Table,
  Tabs,
} from './ui/DesignSystem'

// ─── Types ────────────────────────────────────────────────────────────
interface SolverConfig {
  id: string
  name: string
  path: string
  version: string
  status: 'found' | 'not_found' | 'checking'
  type: 'openfoam' | 'gmsh' | 'paraview' | 'python'
}

interface ProjectSettings {
  defaultSolver: string
  defaultTurbulenceModel: string
  defaultMeshAlgorithm: string
  autoSaveInterval: number
  maxConcurrentSimulations: number
  defaultOutputFormat: string
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  autoCheckUpdates: boolean
  telemetryEnabled: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

interface LicenseInfo {
  type: 'community' | 'professional' | 'enterprise'
  status: 'active' | 'expired' | 'trial'
  expiresAt?: string
  features: string[]
}

// ─── Component ────────────────────────────────────────────────────────
export function SettingsView() {
  const [activeTab, setActiveTab] = useState<'solvers' | 'projects' | 'app' | 'license' | 'advanced'>('solvers')
  const [solvers, setSolvers] = useState<SolverConfig[]>([])
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    defaultSolver: 'openfoam',
    defaultTurbulenceModel: 'kOmegaSST',
    defaultMeshAlgorithm: 'delaunay3d',
    autoSaveInterval: 300,
    maxConcurrentSimulations: 2,
    defaultOutputFormat: 'vtk',
  })
  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'system',
    language: 'en',
    autoCheckUpdates: true,
    telemetryEnabled: false,
    logLevel: 'info',
  })
  const [license] = useState<LicenseInfo>({
    type: 'community',
    status: 'active',
    features: ['Basic CFD', 'Mesh Generation', 'Post-Processing'],
  })
  const [checkingSolvers, setCheckingSolvers] = useState(false)
  const [testingSolver, setTestingSolver] = useState<string | null>(null)
  const [showAddSolverModal, setShowAddSolverModal] = useState(false)
  const [newSolver, setNewSolver] = useState({ name: '', path: '', type: 'openfoam' as SolverConfig['type'] })

  useEffect(() => {
    const mockSolvers: SolverConfig[] = [
      { id: '1', name: 'OpenFOAM v11', path: 'C:\\OpenFOAM\\v11', version: '11.0.0', status: 'found', type: 'openfoam' },
      { id: '2', name: 'OpenFOAM v10', path: 'C:\\OpenFOAM\\v10', version: '10.1.1', status: 'found', type: 'openfoam' },
      { id: '3', name: 'Gmsh 4.12.2', path: 'C:\\Gmsh\\4.12.2\\gmsh.exe', version: '4.12.2', status: 'found', type: 'gmsh' },
      { id: '4', name: 'ParaView 5.12.0', path: 'C:\\ParaView\\5.12.0\\bin\\paraview.exe', version: '5.12.0', status: 'found', type: 'paraview' },
      { id: '5', name: 'Python 3.11', path: 'C:\\Python311\\python.exe', version: '3.11.5', status: 'found', type: 'python' },
      { id: '6', name: 'SU2 v7.5.1', path: 'C:\\SU2\\v7.5.1\\bin\\SU2_CFD.exe', version: '7.5.1', status: 'not_found', type: 'openfoam' },
    ]
    setSolvers(mockSolvers)
  }, [])

  const checkSolver = async (solver: SolverConfig) => {
    setTestingSolver(solver.id)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setSolvers(prev => prev.map(s => s.id === solver.id ? { ...s, status: 'found' as const } : s))
    setTestingSolver(null)
  }

  const checkAllSolvers = async () => {
    setCheckingSolvers(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setSolvers(prev => prev.map(s => ({ ...s, status: 'found' as const })))
    setCheckingSolvers(false)
  }

  const handleAddSolver = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSolver.name || !newSolver.path) return

    const solver: SolverConfig = {
      id: Date.now().toString(),
      name: newSolver.name,
      path: newSolver.path,
      version: 'Unknown',
      status: 'checking',
      type: newSolver.type,
    }
    setSolvers([...solvers, solver])
    setShowAddSolverModal(false)
    setNewSolver({ name: '', path: '', type: 'openfoam' })
    setTimeout(() => checkSolver(solver), 500)
  }

  const handleRemoveSolver = (id: string) => {
    if (window.confirm('Remove this solver configuration?')) {
      setSolvers(prev => prev.filter(s => s.id !== id))
    }
  }

  const handleProjectSettingsChange = (key: keyof ProjectSettings, value: any) => {
    setProjectSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleAppSettingsChange = (key: keyof AppSettings, value: any) => {
    setAppSettings(prev => ({ ...prev, [key]: value }))
    if (key === 'theme') {
      document.documentElement.setAttribute('data-theme', value)
    }
  }

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'found': return 'success'
      case 'not_found': return 'error'
      case 'checking': return 'warning'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'openfoam': return <OpenFOAMIcon />
      case 'gmsh': return <GmshIcon />
      case 'paraview': return <ParaViewIcon />
      case 'python': return <PythonIcon />
      default: return <SettingsIcon />
    }
  }

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className="settings-view p-6 space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-display-md text-text-primary">Settings</h2>
      </div>

      {/* ─── Layout ───────────────────────────────────────────────────── */}
      <div className="settings-layout grid grid-cols-[240px_1fr] gap-6 min-h-[calc(100vh-200px)]">
        {/* ─── Sidebar Navigation ─────────────────────────────────────── */}
        <nav className="settings-nav flex flex-col gap-1 p-4 bg-bg-secondary rounded-xl border border-border-subtle h-fit" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <Tabs
            tabs={[
              { key: 'solvers', label: 'Solvers & Tools', icon: <SettingsIcon /> },
              { key: 'projects', label: 'Project Defaults', icon: <FolderIcon /> },
              { key: 'app', label: 'Appearance', icon: <PaletteIcon /> },
              { key: 'license', label: 'License', icon: <LicenseIcon /> },
              { key: 'advanced', label: 'Advanced', icon: <CogIcon /> },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pills"
            className="w-full"
          />
        </nav>

        {/* ─── Content ────────────────────────────────────────────────── */}
        <div className="settings-content min-w-0">
          {/* ─── Solvers Tab ──────────────────────────────────────────── */}
          {activeTab === 'solvers' && (
            <div className="space-y-6">
              <Card padding="lg">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-heading-lg text-text-primary">Solver & Tool Configuration</h3>
                    <p className="text-body-sm text-text-muted mt-1">Configure external solvers and tools used by HX CFD</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={checkAllSolvers} disabled={checkingSolvers} icon={<RefreshIcon />} iconPosition="left">
                      {checkingSolvers ? 'Checking...' : 'Check All'}
                    </Button>
                    <Button variant="primary" onClick={() => setShowAddSolverModal(true)} icon={<PlusIcon />} iconPosition="left">
                      Add Solver
                    </Button>
                  </div>
                </div>

                <Table
                  columns={[
                    { key: 'type', header: 'Type', render: (s) => (
                      <Badge variant="info" size="sm" className="gap-1">
                        {getTypeIcon(s.type)} {getTypeLabel(s.type)}
                      </Badge>
                    )},
                    { key: 'name', header: 'Name', render: (s) => <strong>{s.name}</strong> },
                    { key: 'path', header: 'Path', className: 'font-mono text-body-sm text-text-muted max-w-xs truncate', render: (s) => <span title={s.path}>{s.path}</span> },
                    { key: 'version', header: 'Version' },
                    { key: 'status', header: 'Status', render: (s) => (
                      <Badge variant={getStatusVariant(s.status)} size="sm">
                        {s.status === 'checking' ? 'Checking...' : getStatusLabel(s.status)}
                      </Badge>
                    )},
                    { key: 'actions', header: 'Actions', render: (s) => (
                      <div className="flex items-center gap-2">
                        {s.status !== 'found' && !testingSolver && (
                          <Button variant="secondary" size="sm" onClick={() => checkSolver(s)}>Check</Button>
                        )}
                        {testingSolver === s.id && <span className="animate-spin text-text-muted">⟳</span>}
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveSolver(s.id)} className="text-accent-red hover:text-accent-redHover">
                          <TrashIcon />
                        </Button>
                      </div>
                    )},
                  ]}
                  data={solvers}
                  keyField="id"
                  hoverable
                />
              </Card>

              {/* ─── Solver Hints ───────────────────────────────────────── */}
              <Card padding="md" className="bg-accent-blue/5 border-accent-blue/20">
                <h4 className="text-heading-sm text-text-primary mb-3">Expected Paths</h4>
                <ul className="space-y-2 text-body-sm text-text-secondary">
                  <li><strong>OpenFOAM:</strong> Root installation directory (e.g., <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-primary font-mono text-caption-sm">C:\OpenFOAM\v11</code>)</li>
                  <li><strong>Gmsh:</strong> Executable file (e.g., <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-primary font-mono text-caption-sm">C:\Gmsh\4.12.2\gmsh.exe</code>)</li>
                  <li><strong>ParaView:</strong> Executable file (e.g., <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-primary font-mono text-caption-sm">C:\ParaView\5.12.0\bin\paraview.exe</code>)</li>
                  <li><strong>Python:</strong> Executable file (e.g., <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-primary font-mono text-caption-sm">C:\Python311\python.exe</code>)</li>
                </ul>
              </Card>
            </div>
          )}

          {/* ─── Projects Tab ────────────────────────────────────────────── */}
          {activeTab === 'projects' && (
            <div className="space-y-6 max-w-3xl">
              <Card padding="lg">
                <h3 className="text-heading-lg text-text-primary mb-6">Project Default Settings</h3>
                <div className="space-y-5">
                  <Select
                    label="Default Solver"
                    value={projectSettings.defaultSolver}
                    onChange={(e) => handleProjectSettingsChange('defaultSolver', e.target.value)}
                    options={[
                      { value: 'openfoam', label: 'OpenFOAM' },
                      { value: 'su2', label: 'SU2' },
                      { value: 'code_saturne', label: 'Code_Saturne' },
                    ]}
                  />
                  <Select
                    label="Default Turbulence Model"
                    value={projectSettings.defaultTurbulenceModel}
                    onChange={(e) => handleProjectSettingsChange('defaultTurbulenceModel', e.target.value)}
                    options={[
                      { value: 'kOmegaSST', label: 'k-ω SST' },
                      { value: 'kEpsilon', label: 'k-ε' },
                      { value: 'realizableKE', label: 'Realizable k-ε' },
                      { value: 'spalartAllmaras', label: 'Spalart-Allmaras' },
                      { value: 'laminar', label: 'Laminar' },
                    ]}
                  />
                  <Select
                    label="Default Mesh Algorithm"
                    value={projectSettings.defaultMeshAlgorithm}
                    onChange={(e) => handleProjectSettingsChange('defaultMeshAlgorithm', e.target.value)}
                    options={[
                      { value: 'delaunay3d', label: 'Delaunay 3D' },
                      { value: 'hxt', label: 'HXT (Hex-dominant)' },
                      { value: 'netgen', label: 'Netgen' },
                      { value: 'mmg', label: 'MMG' },
                      { value: 'boundaryLayer', label: 'Boundary Layer' },
                    ]}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Auto-save Interval (seconds)"
                      type="number"
                      value={projectSettings.autoSaveInterval}
                      onChange={(e) => handleProjectSettingsChange('autoSaveInterval', parseInt(e.target.value))}
                      min={60}
                      max={3600}
                    />
                    <Input
                      label="Max Concurrent Simulations"
                      type="number"
                      value={projectSettings.maxConcurrentSimulations}
                      onChange={(e) => handleProjectSettingsChange('maxConcurrentSimulations', parseInt(e.target.value))}
                      min={1}
                      max={8}
                    />
                  </div>
                  <Select
                    label="Default Output Format"
                    value={projectSettings.defaultOutputFormat}
                    onChange={(e) => handleProjectSettingsChange('defaultOutputFormat', e.target.value)}
                    options={[
                      { value: 'vtk', label: 'VTK (Legacy)' },
                      { value: 'vtu', label: 'VTU (XML)' },
                      { value: 'foam', label: 'OpenFOAM Native' },
                      { value: 'cgns', label: 'CGNS' },
                    ]}
                  />
                  <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                    <Button variant="primary">Save Project Defaults</Button>
                    <Button variant="secondary">Reset to Defaults</Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ─── App Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'app' && (
            <div className="space-y-6 max-w-2xl">
              <Card padding="lg">
                <h3 className="text-heading-lg text-text-primary mb-6">Appearance & Behavior</h3>
                <div className="space-y-5">
                  <Select
                    label="Theme"
                    value={appSettings.theme}
                    onChange={(e) => handleAppSettingsChange('theme', e.target.value as 'light' | 'dark' | 'system')}
                    options={[
                      { value: 'system', label: 'System Default' },
                      { value: 'light', label: 'Light' },
                      { value: 'dark', label: 'Dark' },
                    ]}
                  />
                  <Select
                    label="Language"
                    value={appSettings.language}
                    onChange={(e) => handleAppSettingsChange('language', e.target.value)}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'de', label: 'German' },
                      { value: 'fr', label: 'French' },
                      { value: 'es', label: 'Spanish' },
                      { value: 'ja', label: 'Japanese' },
                      { value: 'zh', label: 'Chinese' },
                    ]}
                  />
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appSettings.autoCheckUpdates}
                      onChange={(e) => handleAppSettingsChange('autoCheckUpdates', e.target.checked)}
                      className="w-4 h-4 rounded border-border-default text-accent-blue focus:ring-2 focus:ring-accent-blue/20"
                    />
                    <span className="text-body text-text-primary">Automatically check for updates</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appSettings.telemetryEnabled}
                      onChange={(e) => handleAppSettingsChange('telemetryEnabled', e.target.checked)}
                      className="w-4 h-4 rounded border-border-default text-accent-blue focus:ring-2 focus:ring-accent-blue/20"
                    />
                    <span className="text-body text-text-primary">Send anonymous usage statistics</span>
                  </label>
                  <Select
                    label="Log Level"
                    value={appSettings.logLevel}
                    onChange={(e) => handleAppSettingsChange('logLevel', e.target.value as 'debug' | 'info' | 'warn' | 'error')}
                    options={[
                      { value: 'debug', label: 'Debug' },
                      { value: 'info', label: 'Info' },
                      { value: 'warn', label: 'Warning' },
                      { value: 'error', label: 'Error Only' },
                    ]}
                  />
                  <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                    <Button variant="primary">Save Appearance Settings</Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
// ─── License Tab ───────────────────────────────────────────────
          {/* ─── License Tab ─────────────────────────────────────────────── */}
          {activeTab === 'license' && (
            <div className="space-y-6 max-w-2xl">
              <Card padding="lg">
                <h3 className="text-heading-lg text-text-primary mb-6">License Information</h3>
                <div className="bg-gradient-to-r from-accent-blue/10 to-accent-purple/10 border border-accent-blue/20 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="info" className="text-sm">{license.type.charAt(0).toUpperCase() + license.type.slice(1)}</Badge>
                        <Badge variant="success" className="text-sm">{license.status.charAt(0).toUpperCase() + license.status.slice(1)}</Badge>
                      </div>
                      <p className="text-body text-text-muted">HX CFD Community Edition - Free for personal and commercial use</p>
                    </div>
                    {license.expiresAt && (
                      <div className="text-body-sm text-text-muted">
                        Expires: {new Date(license.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-heading-sm text-text-primary">Included Features</h4>
                    <ul className="space-y-2">
                      {license.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-body text-text-secondary">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-green flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-border-subtle">
                    {license.type === 'community' && (
                      <Button variant="primary" icon={<ArrowUpIcon />} iconPosition="left">Upgrade License</Button>
                    )}
                    {license.status === 'trial' && (
                      <Button variant="secondary" icon={<KeyIcon />} iconPosition="left">Enter License Key</Button>
                    )}
                    <Button variant="secondary" icon={<FileTextIcon />} iconPosition="left">View License Details</Button>
                  </div>
                </Card>

                <Card padding="lg">
                  <h4 className="text-heading-md text-text-primary mb-4">Feature Comparison</h4>
                  <Table
                    columns={[
                      { key: 'feature', header: 'Feature' },
                      { key: 'community', header: 'Community', render: () => <span className="text-center text-accent-green">✓</span> },
                      { key: 'professional', header: 'Professional', render: () => <span className="text-center text-accent-green">✓</span> },
                      { key: 'enterprise', header: 'Enterprise', render: () => <span className="text-center text-accent-green">✓</span> },
                    ]}
                    data={[
                      { feature: 'Basic CFD Solvers', community: true, professional: true, enterprise: true },
                      { feature: 'Mesh Generation (Gmsh)', community: true, professional: true, enterprise: true },
                      { feature: 'Post-Processing (ParaView)', community: true, professional: true, enterprise: true },
                      { feature: 'Parallel Processing', community: '2 cores', professional: '16 cores', enterprise: 'Unlimited' },
                      { feature: 'Optimization Module', community: false, professional: true, enterprise: true },
                      { feature: 'Custom Solvers', community: false, professional: true, enterprise: true },
                      { feature: 'Cloud/HPC Integration', community: false, professional: false, enterprise: true },
                      { feature: 'Priority Support', community: false, professional: true, enterprise: true },
                      { feature: 'Source Code Access', community: false, professional: false, enterprise: true },
                    ]}
                    keyField="feature"
                  />
                </Card>
              </div>
            )}

            {/* ─── Advanced Tab ─────────────────────────────────────────────── */}
            {activeTab === 'advanced' && (
              <div className="space-y-6 max-w-3xl">
                <Card padding="lg">
                  <h3 className="text-heading-lg text-text-primary mb-6">Advanced Settings</h3>
                  <div className="space-y-5">
                    <Input label="Working Directory" value="C:\\CFD\\Projects" readOnly />
                    <small className="text-caption-sm text-text-muted">Change requires application restart</small>
                    <Input label="Cache Directory" value="C:\\CFD\\Cache" readOnly />
                    <Input label="Log Directory" value="C:\\CFD\\Logs" readOnly />
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border-default text-accent-blue focus:ring-2 focus:ring-accent-blue/20" />
                      <span className="text-body text-text-primary">Enable GPU Acceleration (if available)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border-default text-accent-blue focus:ring-2 focus:ring-accent-blue/20" />
                      <span className="text-body text-text-primary">Use System Proxy Settings</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-border-default text-accent-blue focus:ring-2 focus:ring-accent-blue/20" />
                      <span className="text-body text-text-primary">Enable Experimental Features</span>
                    </label>
                    <Input label="Python Environment Path" value="C:\\CFD\\venv" readOnly />
                    <small className="text-caption-sm text-text-muted">Managed by the application</small>
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-border-subtle">
                      <Button variant="secondary" icon={<FolderIcon />} iconPosition="left">Open Config Folder</Button>
                      <Button variant="secondary" icon={<FileTextIcon />} iconPosition="left">View Logs</Button>
                      <Button variant="danger" icon={<TrashIcon />} iconPosition="left">Reset All Settings</Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ─── Add Solver Modal ─────────────────────────────────────────── */}
            <Modal
              isOpen={showAddSolverModal}
              onClose={() => setShowAddSolverModal(false)}
              title="Add Solver / Tool"
              size="md"
            >
              <form onSubmit={handleAddSolver} className="space-y-5">
                <Select
                  label="Type"
                  value={newSolver.type}
                  onChange={(e) => setNewSolver({ ...newSolver, type: e.target.value as SolverConfig['type'] })}
                  options={[
                    { value: 'openfoam', label: 'OpenFOAM' },
                    { value: 'gmsh', label: 'Gmsh' },
                    { value: 'paraview', label: 'ParaView' },
                    { value: 'python', label: 'Python' },
                  ]}
                />
                <Input
                  label="Name"
                  value={newSolver.name}
                  onChange={(e) => setNewSolver({ ...newSolver, name: e.target.value })}
                  placeholder="e.g., OpenFOAM v11"
                  required
                />
                <Input
                  label="Path"
                  value={newSolver.path}
                  onChange={(e) => setNewSolver({ ...newSolver, path: e.target.value })}
                  placeholder="e.g., C:\\OpenFOAM\\v11"
                  required
                />
                <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                  <Button variant="secondary" onClick={() => setShowAddSolverModal(false)}>Cancel</Button>
                  <Button variant="primary" type="submit">Add Solver</Button>
                </div>
              </form>
            </Modal>
          </div>
      </div>
    </div>
  )
}

// ─── Helper Components ────────────────────────────────────────────────

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-subtle/50">
      <span className="text-caption-sm text-text-muted">{label}</span>
      <span className="text-body-sm text-text-primary text-right max-w-[60%] truncate">{value}</span>
    </div>
  )
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'found': return 'success'
    case 'not_found': return 'error'
    case 'checking': return 'warning'
    default: return 'default'
  }
}

function getStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'openfoam': return <OpenFOAMIcon />
    case 'gmsh': return <GmshIcon />
    case 'paraview': return <ParaViewIcon />
    case 'python': return <PythonIcon />
    default: return <SettingsIcon />
  }
}

function getTypeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

// ─── Icons ────────────────────────────────────────────────────────────
function SettingsIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> }
function FolderIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><path d="M3 9h18"/></svg> }
function PaletteIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="5.5"/><path d="M13.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg> }
function LicenseIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg> }
function CogIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> }
function OpenFOAMIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14"/></svg> }
function GmshIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"/><path d="M4 12h16"/><path d="M12 4v16"/></svg> }
function ParaViewIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg> }
function PythonIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M12 3a5 5 0 0 1 5 5M12 21a5 5 0 0 0 5-5"/></svg> }
function RefreshIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> }
function PlusIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }
function TrashIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> }
function PlayIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5h5v5H5zM14 14h5v5h-5zM7.5 10v2a2 2 0 0 0 2 2H14"/></svg> }
function PauseIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> }
function ChartIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> }
function FileTextIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> }
function ArrowUpIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/><path d="M12 3v18"/></svg> }
function KeyIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg> }