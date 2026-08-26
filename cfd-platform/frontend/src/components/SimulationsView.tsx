import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Textarea,
  Modal,
  Table,
  ProgressBar,
  EmptyState,
} from './ui/DesignSystem'

// ─── Types ────────────────────────────────────────────────────────────
interface Simulation {
  id: string
  name: string
  projectId: string
  projectName: string
  meshId: string
  meshName: string
  solverType: string
  turbulenceModel: string
  status: string
  progress: number
  currentIteration: number
  maxIterations: number
  timeStep: number
  endTime: number
  cpuHours: number
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  residuals?: {
    Ux: number
    Uy: number
    Uz: number
    p: number
    k: number
    epsilon: number
  }
}

interface Project {
  id: string
  name: string
}

interface Mesh {
  id: string
  name: string
  projectId: string
}

// ─── Component ────────────────────────────────────────────────────────
export function SimulationsView() {
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [meshes, setMeshes] = useState<Mesh[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailTab, setDetailTab] = useState<'overview' | 'residuals' | 'settings' | 'post'>('overview')

  const [newSimulation, setNewSimulation] = useState({
    name: '',
    projectId: '',
    meshId: '',
    solverType: 'openfoam',
    turbulenceModel: 'kOmegaSST',
    timeStep: 0.001,
    endTime: 1000,
    maxIterations: 1000,
  })

  useEffect(() => {
    const mockProjects: Project[] = [
      { id: '1', name: 'Airfoil Analysis' },
      { id: '2', name: 'Pipe Flow' },
      { id: '3', name: 'Heat Exchanger' },
      { id: '4', name: 'Car Aerodynamics' },
      { id: '5', name: 'Turbine Blade' },
    ]

    const mockMeshes: Mesh[] = [
      { id: '1', name: 'Airfoil Mesh - Fine', projectId: '1' },
      { id: '2', name: 'Pipe Bend Mesh', projectId: '2' },
      { id: '3', name: 'Heat Exchanger Mesh', projectId: '3' },
      { id: '4', name: 'Car Body Mesh', projectId: '4' },
      { id: '5', name: 'Turbine Blade Mesh', projectId: '5' },
    ]

    const mockSimulations: Simulation[] = [
      {
        id: '1',
        name: 'Airfoil AoA 5deg',
        projectId: '1',
        projectName: 'Airfoil Analysis',
        meshId: '1',
        meshName: 'Airfoil Mesh - Fine',
        solverType: 'OpenFOAM',
        turbulenceModel: 'k-ω SST',
        status: 'running',
        progress: 65,
        currentIteration: 650,
        maxIterations: 1000,
        timeStep: 0.001,
        endTime: 1000,
        cpuHours: 12.5,
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
        startedAt: '2024-01-15 10:30',
        residuals: { Ux: 1.2e-4, Uy: 8.5e-5, Uz: 9.1e-5, p: 2.3e-4, k: 1.8e-4, epsilon: 2.1e-4 },
      },
      {
        id: '2',
        name: 'Pipe Flow Re=50000',
        projectId: '2',
        projectName: 'Pipe Flow',
        meshId: '2',
        meshName: 'Pipe Bend Mesh',
        solverType: 'OpenFOAM',
        turbulenceModel: 'k-ε',
        status: 'running',
        progress: 42,
        currentIteration: 420,
        maxIterations: 1000,
        timeStep: 0.005,
        endTime: 500,
        cpuHours: 8.2,
        createdAt: '2024-01-14',
        updatedAt: '2024-01-14',
        startedAt: '2024-01-14 14:20',
        residuals: { Ux: 3.4e-3, Uy: 2.8e-3, Uz: 3.1e-3, p: 5.2e-3, k: 4.1e-3, epsilon: 3.8e-3 },
      },
      {
        id: '3',
        name: 'Car Aerodynamics - 60mph',
        projectId: '4',
        projectName: 'Car Aerodynamics',
        meshId: '4',
        meshName: 'Car Body Mesh',
        solverType: 'OpenFOAM',
        turbulenceModel: 'k-ω SST',
        status: 'pending',
        progress: 0,
        currentIteration: 0,
        maxIterations: 2000,
        timeStep: 0.001,
        endTime: 2000,
        cpuHours: 0,
        createdAt: '2024-01-12',
        updatedAt: '2024-01-12',
        residuals: { Ux: 0, Uy: 0, Uz: 0, p: 0, k: 0, epsilon: 0 },
      },
      {
        id: '4',
        name: 'Heat Exchanger - Design 1',
        projectId: '3',
        projectName: 'Heat Exchanger',
        meshId: '3',
        meshName: 'Heat Exchanger Mesh',
        solverType: 'OpenFOAM',
        turbulenceModel: 'k-ω SST',
        status: 'completed',
        progress: 100,
        currentIteration: 1000,
        maxIterations: 1000,
        timeStep: 0.01,
        endTime: 1000,
        cpuHours: 45.7,
        createdAt: '2024-01-10',
        updatedAt: '2024-01-10',
        startedAt: '2024-01-10 09:00',
        completedAt: '2024-01-10 18:30',
        residuals: { Ux: 8.2e-6, Uy: 6.1e-6, Uz: 7.3e-6, p: 1.2e-5, k: 9.4e-6, epsilon: 1.1e-5 },
      },
      {
        id: '5',
        name: 'Turbine Blade - Cooling',
        projectId: '5',
        projectName: 'Turbine Blade',
        meshId: '5',
        meshName: 'Turbine Blade Mesh',
        solverType: 'OpenFOAM',
        turbulenceModel: 'k-ω SST',
        status: 'failed',
        progress: 78,
        currentIteration: 780,
        maxIterations: 1000,
        timeStep: 0.001,
        endTime: 1000,
        cpuHours: 22.3,
        createdAt: '2024-01-08',
        updatedAt: '2024-01-08',
        startedAt: '2024-01-08 11:00',
        residuals: { Ux: 0.12, Uy: 0.08, Uz: 0.11, p: 0.15, k: 0.09, epsilon: 0.13 },
      },
    ]

    setProjects(mockProjects)
    setMeshes(mockMeshes)
    setSimulations(mockSimulations)
    setLoading(false)

    const interval = setInterval(() => {
      setSimulations(prev => prev.map(sim => {
        if (sim.status === 'running' && sim.progress < 100) {
          const newProgress = Math.min(100, sim.progress + Math.random() * 2)
          const newIteration = Math.min(sim.maxIterations, sim.currentIteration + Math.floor(Math.random() * 5))
          return {
            ...sim,
            progress: newProgress,
            currentIteration: newIteration,
            updatedAt: new Date().toISOString().split('T')[0],
            residuals: sim.residuals ? {
              Ux: sim.residuals.Ux * 0.99,
              Uy: sim.residuals.Uy * 0.99,
              Uz: sim.residuals.Uz * 0.99,
              p: sim.residuals.p * 0.99,
              k: sim.residuals.k * 0.99,
              epsilon: sim.residuals.epsilon * 0.99,
            } : undefined,
          }
        }
        return sim
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'running':
      case 'completed':
        return 'success'
      case 'pending':
        return 'warning'
      case 'failed':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const handleCreateSimulation = (e: React.FormEvent) => {
    e.preventDefault()
    const project = projects.find(p => p.id === newSimulation.projectId)
    const mesh = meshes.find(m => m.id === newSimulation.meshId)

    const simulation: Simulation = {
      id: Date.now().toString(),
      name: newSimulation.name,
      projectId: newSimulation.projectId,
      projectName: project?.name || '',
      meshId: newSimulation.meshId,
      meshName: mesh?.name || '',
      solverType: newSimulation.solverType === 'openfoam' ? 'OpenFOAM' : 'SU2',
      turbulenceModel: newSimulation.turbulenceModel === 'kOmegaSST' ? 'k-ω SST' :
        newSimulation.turbulenceModel === 'kEpsilon' ? 'k-ε' : 'Spalart-Allmaras',
      status: 'pending',
      progress: 0,
      currentIteration: 0,
      maxIterations: newSimulation.maxIterations,
      timeStep: newSimulation.timeStep,
      endTime: newSimulation.endTime,
      cpuHours: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      residuals: { Ux: 0, Uy: 0, Uz: 0, p: 0, k: 0, epsilon: 0 },
    }

    setSimulations([simulation, ...simulations])
    setShowCreateModal(false)
    setNewSimulation({ name: '', projectId: '', meshId: '', solverType: 'openfoam', turbulenceModel: 'kOmegaSST', timeStep: 0.001, endTime: 1000, maxIterations: 1000 })
  }

  const handleStartSimulation = (id: string) => {
    setSimulations(prev => prev.map(sim =>
      sim.id === id ? { ...sim, status: 'running', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString().split('T')[0] } : sim
    ))
  }

  const handleStopSimulation = (id: string) => {
    setSimulations(prev => prev.map(sim =>
      sim.id === id ? { ...sim, status: 'pending', updatedAt: new Date().toISOString().split('T')[0] } : sim
    ))
  }

  const handleDeleteSimulation = (id: string) => {
    if (window.confirm('Are you sure you want to delete this simulation?')) {
      setSimulations(prev => prev.filter(sim => sim.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="simulations-view p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-bg-tertiary rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-72 bg-bg-tertiary rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="simulations-view p-6 space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-display-md text-text-primary">Simulations</h2>
        <Button variant="primary" icon={<PlusIcon />} iconPosition="left" onClick={() => setShowCreateModal(true)}>
          New Simulation
        </Button>
      </div>

      {/* ─── Simulations Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {simulations.map((sim) => (
          <Card
            key={sim.id}
            padding="md"
            hover
            onClick={() => { setSelectedSimulation(sim); setShowDetailModal(true); }}
            className="cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-heading-sm text-text-primary truncate">{sim.name}</h3>
                <Badge variant={getStatusVariant(sim.status)} className="mt-2">
                  {getStatusLabel(sim.status)}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-tertiary rounded-lg p-3">
                  <div className="text-caption-sm text-text-muted">Project</div>
                  <div className="font-medium text-text-primary">{sim.projectName}</div>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-3">
                  <div className="text-caption-sm text-text-muted">Mesh</div>
                  <div className="font-medium text-text-primary">{sim.meshName}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-tertiary rounded-lg p-3">
                  <div className="text-caption-sm text-text-muted">Solver</div>
                  <div className="font-medium text-text-primary"><Badge variant="info" size="sm">{sim.solverType}</Badge></div>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-3">
                  <div className="text-caption-sm text-text-muted">Turbulence</div>
                  <div className="font-medium text-text-primary">{sim.turbulenceModel}</div>
                </div>
              </div>

              {sim.status === 'running' && (
                <div className="simulation-progress">
                  <ProgressBar value={sim.progress} size="md" showLabel />
                  <div className="flex justify-between text-caption-sm text-text-muted">
                    <span>Iteration: {sim.currentIteration} / {sim.maxIterations}</span>
                    <span>{sim.progress.toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {sim.status === 'completed' && (
                <div className="flex flex-wrap gap-4 pt-2 border-t border-border-subtle">
                  <span className="text-caption-sm text-text-muted flex items-center gap-1">
                    <span className="text-text-primary">{sim.cpuHours.toFixed(1)}</span> CPU Hours
                  </span>
                  <span className="text-caption-sm text-text-muted flex items-center gap-1">
                    Residuals: {sim.residuals ? sim.residuals.Ux.toExponential(1) : 'N/A'}
                  </span>
                </div>
              )}

              {sim.status === 'failed' && (
                <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
                  <p className="text-body-sm text-accent-red flex items-center gap-2">
                    <span>⚠</span>
                    <span>Simulation failed at iteration {sim.currentIteration}</span>
                  </p>
                  <p className="text-caption-sm text-accent-red/80 mt-1">Residuals diverged</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border-subtle">
                {sim.status === 'pending' && (
                  <Button variant="primary" size="sm" icon={<PlayIcon />} iconPosition="left" onClick={(e) => { e.stopPropagation(); handleStartSimulation(sim.id); }}>
                    Start
                  </Button>
                )}
                {sim.status === 'running' && (
                  <Button variant="secondary" size="sm" icon={<PauseIcon />} iconPosition="left" onClick={(e) => { e.stopPropagation(); handleStopSimulation(sim.id); }}>
                    Stop
                  </Button>
                )}
                {sim.status === 'completed' && (
                  <Button variant="secondary" size="sm" icon={<ChartIcon />} iconPosition="left" onClick={(e) => { e.stopPropagation(); setSelectedSimulation(sim); setShowDetailModal(true); }}>
                    Results
                  </Button>
                )}
                {sim.status === 'failed' && (
                  <Button variant="secondary" size="sm" icon={<RefreshIcon />} iconPosition="left" onClick={(e) => { e.stopPropagation(); handleStartSimulation(sim.id); }}>
                    Restart
                  </Button>
                )}
                <Button variant="ghost" size="sm" icon={<TrashIcon />} iconPosition="left" onClick={(e) => { e.stopPropagation(); handleDeleteSimulation(sim.id); }} className="text-accent-red hover:text-accent-redHover">
                </Button>
              </div>
          </Card>
        ))}
      </div>

      {/* ─── Create Simulation Modal ─────────────────────────────────── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Simulation"
        size="lg"
      >
        <form onSubmit={handleCreateSimulation} className="space-y-5">
          <Input
            label="Simulation Name"
            value={newSimulation.name}
            onChange={(e) => setNewSimulation({ ...newSimulation, name: e.target.value })}
            placeholder="e.g., Airfoil AoA 10deg"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Project"
              value={newSimulation.projectId}
              onChange={(e) => setNewSimulation({ ...newSimulation, projectId: e.target.value, meshId: '' })}
              options={[
                { value: '', label: 'Select project...' },
                ...projects.map((p) => ({ value: p.id, label: p.name }))
              ]}
              required
            />
            <Select
              label="Mesh"
              value={newSimulation.meshId}
              onChange={(e) => setNewSimulation({ ...newSimulation, meshId: e.target.value })}
              options={[
                { value: '', label: 'Select mesh...' },
                ...meshes.filter(m => m.projectId === newSimulation.projectId).map((m) => ({ value: m.id, label: m.name }))
              ]}
              required
              disabled={!newSimulation.projectId}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Solver"
              value={newSimulation.solverType}
              onChange={(e) => setNewSimulation({ ...newSimulation, solverType: e.target.value })}
              options={[
                { value: 'openfoam', label: 'OpenFOAM' },
                { value: 'su2', label: 'SU2' },
              ]}
            />
            <Select
              label="Turbulence Model"
              value={newSimulation.turbulenceModel}
              onChange={(e) => setNewSimulation({ ...newSimulation, turbulenceModel: e.target.value })}
              options={[
                { value: 'kOmegaSST', label: 'k-ω SST' },
                { value: 'kEpsilon', label: 'k-ε' },
                { value: 'spalartAllmaras', label: 'Spalart-Allmaras' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Time Step"
              type="number"
              step="0.0001"
              min="0.00001"
              max="1"
              value={newSimulation.timeStep}
              onChange={(e) => setNewSimulation({ ...newSimulation, timeStep: parseFloat(e.target.value) })}
            />
            <Input
              label="End Time"
              type="number"
              step="1"
              min="1"
              max="100000"
              value={newSimulation.endTime}
              onChange={(e) => setNewSimulation({ ...newSimulation, endTime: parseFloat(e.target.value) })}
            />
          </div>
          <Input
            label="Max Iterations"
            type="number"
            min="100"
            max="100000"
            value={newSimulation.maxIterations}
            onChange={(e) => setNewSimulation({ ...newSimulation, maxIterations: parseInt(e.target.value) })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Simulation</Button>
          </div>
        </form>
      </Modal>

      {/* ─── Detail Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={showDetailModal && !!selectedSimulation}
        onClose={() => { setShowDetailModal(false); setSelectedSimulation(null); }}
        title={selectedSimulation?.name}
        size="xl"
      >
        {!selectedSimulation ? null : (
          <>
            <div className="space-y-6">
              {/* ─── Tabs ─────────────────────────────────────────────── */}
              <div className="flex border-b border-border-subtle" role="tablist">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'residuals', label: 'Residuals' },
                  { key: 'settings', label: 'Settings' },
                  { key: 'post', label: 'Post-Processing' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={detailTab === tab.key}
                    aria-controls={`panel-${tab.key}`}
                    id={`tab-${tab.key}`}
                    onClick={() => setDetailTab(tab.key)}
                    className={twMerge(
                      'px-4 py-3 text-caption font-medium rounded-t-lg border-b-2 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50',
                      detailTab === tab.key
                        ? 'text-accent-blue border-accent-blue bg-bg-tertiary'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ─── Overview Tab ─────────────────────────────────────── */}
              {detailTab === 'overview' && (
                <div className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-heading-sm text-text-primary border-b border-border-subtle pb-2">Simulation Info</h4>
                      <div className="space-y-3">
                        <DetailItem label="Project" value={selectedSimulation.projectName} />
                        <DetailItem label="Mesh" value={selectedSimulation.meshName} />
                        <DetailItem label="Solver" value={<Badge variant="info" size="sm">{selectedSimulation.solverType}</Badge>} />
                        <DetailItem label="Turbulence Model" value={selectedSimulation.turbulenceModel} />
                        <DetailItem label="Status" value={<Badge variant={getStatusVariant(selectedSimulation.status)}>{getStatusLabel(selectedSimulation.status)}</Badge>} />
                        <DetailItem label="Created" value={selectedSimulation.createdAt} />
                        <DetailItem label="Started" value={selectedSimulation.startedAt || '—'} />
                        <DetailItem label="Completed" value={selectedSimulation.completedAt || '—'} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-heading-sm text-text-primary border-b border-border-subtle pb-2">Configuration</h4>
                      <div className="space-y-3">
                        <DetailItem label="Time Step" value={selectedSimulation.timeStep} />
                        <DetailItem label="End Time" value={selectedSimulation.endTime} />
                        <DetailItem label="Max Iterations" value={selectedSimulation.maxIterations} />
                        <DetailItem label="Turbulence Model" value={selectedSimulation.turbulenceModel} />
                        <DetailItem label="CPU Hours" value={selectedSimulation.cpuHours.toFixed(1)} />
                      </div>
                    </div>
                  </div>

                  {selectedSimulation.residuals && (
                    <div className="border-t border-border-subtle pt-6">
                      <h4 className="text-heading-sm text-text-primary mb-4">Current Residuals</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(selectedSimulation.residuals).map(([key, value]) => (
                          <div key={key} className="bg-bg-tertiary rounded-lg p-3 flex items-center justify-between">
                            <span className="font-mono text-caption text-text-muted">{key}</span>
                            <span className="font-mono text-body-sm text-text-primary">{typeof value === 'number' ? value.toExponential(2) : value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedSimulation.progress > 0 && (
                    <div className="border-t border-border-subtle pt-6">
                      <h4 className="text-heading-sm text-text-primary mb-4">Progress</h4>
                      <ProgressBar value={selectedSimulation.progress} size="lg" showLabel />
                      <div className="flex justify-between text-caption-sm text-text-muted mt-2">
                        <span>Iteration: {selectedSimulation.currentIteration} / {selectedSimulation.maxIterations}</span>
                        <span>{selectedSimulation.progress.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Residuals Tab ────────────────────────────────────── */}
              {detailTab === 'residuals' && (
                <div className="space-y-6 pt-4">
                  <h4 className="text-heading-sm text-text-primary mb-4">Residual History</h4>
                  <div className="bg-bg-tertiary rounded-xl p-6 min-h-[300px] flex items-center justify-center">
                    <EmptyState
                      icon={<ChartIcon />}
                      title="Residual Plot"
                      description="Real-time residual history chart would be displayed here when connected to the solver."
                    />
                  </div>
                </div>
              )}

              {/* ─── Settings Tab ─────────────────────────────────────── */}
              {detailTab === 'settings' && (
                <div className="space-y-6 pt-4 max-w-2xl">
                  <h4 className="text-heading-sm text-text-primary mb-4">Simulation Settings</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Input
                        label="Time Step"
                        type="number"
                        step="0.0001"
                        min="0.00001"
                        max="1"
                        value={selectedSimulation.timeStep}
                        onChange={(e) => setSelectedSimulation({ ...selectedSimulation!, timeStep: parseFloat(e.target.value) })}
                      />
                      <Input
                        label="End Time"
                        type="number"
                        step="1"
                        min="1"
                        max="100000"
                        value={selectedSimulation.endTime}
                        onChange={(e) => setSelectedSimulation({ ...selectedSimulation!, endTime: parseFloat(e.target.value) })}
                      />
                    </div>
                    <Input
                      label="Max Iterations"
                      type="number"
                      min="100"
                      max="100000"
                      value={selectedSimulation.maxIterations}
                      onChange={(e) => setSelectedSimulation({ ...selectedSimulation!, maxIterations: parseInt(e.target.value) })}
                    />
                    <Select
                      label="Turbulence Model"
                      value={selectedSimulation.turbulenceModel}
                      onChange={(e) => setSelectedSimulation({ ...selectedSimulation!, turbulenceModel: e.target.value })}
                      options={[
                        { value: 'kOmegaSST', label: 'k-ω SST' },
                        { value: 'kEpsilon', label: 'k-ε' },
                        { value: 'spalartAllmaras', label: 'Spalart-Allmaras' },
                      ]}
                    />
                  </div>
                </div>
              )}

              {/* ─── Post-Processing Tab ──────────────────────────────── */}
              {detailTab === 'post' && (
                <div className="space-y-6 pt-4">
                  <h4 className="text-heading-sm text-text-primary mb-4">Post-Processing</h4>
                  <div className="bg-bg-tertiary rounded-xl p-6 min-h-[300px] flex items-center justify-center">
                    <EmptyState
                      icon={<ChartIcon />}
                      title="Post-Processing Tools"
                      description="Create contours, streamlines, vectors, iso-surfaces, and more from the simulation results."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border-subtle">
              {selectedSimulation?.status === 'running' && (
                <Button variant="secondary" icon={<PauseIcon />} iconPosition="left" onClick={() => handleStopSimulation(selectedSimulation.id)}>
                  Stop
                </Button>
              )}
              {selectedSimulation?.status === 'pending' && (
                <Button variant="primary" icon={<PlayIcon />} iconPosition="left" onClick={() => handleStartSimulation(selectedSimulation.id)}>
                  Start
                </Button>
              )}
              {selectedSimulation?.status === 'completed' && (
                <Button variant="primary" icon={<ChartIcon />} iconPosition="left">
                  View Results
                </Button>
              )}
              {selectedSimulation?.status === 'failed' && (
                <Button variant="primary" icon={<RefreshIcon />} iconPosition="left" onClick={() => handleStartSimulation(selectedSimulation.id)}>
                  Restart
                </Button>
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
    case 'running':
    case 'completed':
      return 'success'
    case 'pending':
      return 'warning'
    case 'failed':
      return 'error'
    default:
      return 'default'
  }
}

function getStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// Icons
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 5h5v5H5zM14 14h5v5h-5zM7.5 10v2a2 2 0 0 0 2 2H14" />
      <path d="m12 17 2 2 2-2" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}