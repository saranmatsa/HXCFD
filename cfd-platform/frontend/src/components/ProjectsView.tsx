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
  Avatar,
  EmptyState,
} from './ui/DesignSystem'

// ─── Types ────────────────────────────────────────────────────────────
interface Project {
  id: string
  name: string
  description: string
  solver: string
  turbulenceModel: string
  fluidProperties: string
  status: string
  meshCount: number
  simulationCount: number
  createdAt: string
  updatedAt: string
}

interface Solver {
  id: string
  name: string
  version: string
  description: string
}

interface TurbulenceModel {
  id: string
  name: string
  description: string
}

// ─── Component ────────────────────────────────────────────────────────
export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([])
  const [solvers, setSolvers] = useState<Solver[]>([])
  const [turbulenceModels, setTurbulenceModels] = useState<TurbulenceModel[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    solver: 'openfoam',
    turbulenceModel: 'kEpsilon',
    fluidProperties: 'air',
  })

  useEffect(() => {
    const mockSolvers: Solver[] = [
      { id: 'openfoam', name: 'OpenFOAM', version: 'v11', description: 'Open-source CFD toolbox' },
      { id: 'su2', name: 'SU2', version: 'v7.5.1', description: 'Open-source CFD for aerodynamics' },
      { id: 'code_saturne', name: 'Code_Saturne', version: 'v7.0', description: 'EDF open-source CFD' },
    ]

    const mockTurbulenceModels: TurbulenceModel[] = [
      { id: 'kEpsilon', name: 'k-ε', description: 'Standard k-epsilon model' },
      { id: 'kOmega', name: 'k-ω', description: 'Standard k-omega model' },
      { id: 'kOmegaSST', name: 'k-ω SST', description: 'Shear Stress Transport model' },
      { id: 'spalartAllmaras', name: 'Spalart-Allmaras', description: 'One-equation turbulence model' },
      { id: 'LES', name: 'LES', description: 'Large Eddy Simulation' },
      { id: 'DNS', name: 'DNS', description: 'Direct Numerical Simulation' },
    ]

    const mockProjects: Project[] = [
      {
        id: '1',
        name: 'Airfoil Analysis',
        description: 'NACA 0012 airfoil at various angles of attack (0-15°) for validation against experimental data',
        solver: 'OpenFOAM',
        turbulenceModel: 'k-ω SST',
        fluidProperties: 'Air (ρ=1.225, μ=1.789e-5)',
        status: 'active',
        meshCount: 5,
        simulationCount: 12,
        createdAt: '2024-01-10',
        updatedAt: '2024-01-15',
      },
      {
        id: '2',
        name: 'Pipe Flow',
        description: 'Turbulent flow in a 90-degree pipe bend at Re=50,000 with heat transfer',
        solver: 'OpenFOAM',
        turbulenceModel: 'k-ε',
        fluidProperties: 'Water (ρ=998, μ=1.002e-3)',
        status: 'active',
        meshCount: 3,
        simulationCount: 8,
        createdAt: '2024-01-08',
        updatedAt: '2024-01-14',
      },
      {
        id: '3',
        name: 'Heat Exchanger',
        description: 'Shell and tube heat exchanger optimization for maximum heat transfer',
        solver: 'OpenFOAM',
        turbulenceModel: 'k-ω SST',
        fluidProperties: 'Air/Water',
        status: 'completed',
        meshCount: 4,
        simulationCount: 15,
        createdAt: '2024-01-05',
        updatedAt: '2024-01-10',
      },
      {
        id: '4',
        name: 'Car Aerodynamics',
        description: 'External aerodynamics of sedan vehicle at 60 mph with rotating wheels',
        solver: 'OpenFOAM',
        turbulenceModel: 'k-ω SST',
        fluidProperties: 'Air (ρ=1.225, μ=1.789e-5)',
        status: 'active',
        meshCount: 6,
        simulationCount: 22,
        createdAt: '2024-01-03',
        updatedAt: '2024-01-12',
      },
      {
        id: '5',
        name: 'Turbine Blade',
        description: 'Gas turbine blade internal cooling passage analysis',
        solver: 'OpenFOAM',
        turbulenceModel: 'k-ε',
        fluidProperties: 'Air (ρ=0.5, μ=3.5e-5)',
        status: 'draft',
        meshCount: 2,
        simulationCount: 5,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-08',
      },
    ]

    setTimeout(() => {
      setSolvers(mockSolvers)
      setTurbulenceModels(mockTurbulenceModels)
      setProjects(mockProjects)
      setLoading(false)
    }, 300)
  }, [])

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'success'
      case 'draft':
        return 'info'
      case 'archived':
        return 'default'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    const project: Project = {
      id: String(Date.now()),
      ...newProject,
      status: 'draft',
      meshCount: 0,
      simulationCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    }
    setProjects([project, ...projects])
    setShowCreateModal(false)
    setNewProject({ name: '', description: '', solver: 'openfoam', turbulenceModel: 'kEpsilon', fluidProperties: 'air' })
  }

  if (loading) {
    return (
      <div className="projects-view p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-bg-tertiary rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-64 bg-bg-tertiary rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="projects-view p-6 space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-display-md text-text-primary">Projects</h2>
        <Button variant="primary" icon={<PlusIcon />} iconPosition="left" onClick={() => setShowCreateModal(true)}>
          New Project
        </Button>
      </div>

      {/* ─── Projects Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card
            key={project.id}
            padding="md"
            hover
            onClick={() => { setSelectedProject(project); setShowDetailModal(true); }}
            className="cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-heading-sm text-text-primary truncate">{project.name}</h3>
                <Badge variant={getStatusVariant(project.status)} className="mt-2">
                  {getStatusLabel(project.status)}
                </Badge>
              </div>
            </div>

            <p className="text-body-sm text-text-muted line-clamp-2 mb-4">{project.description}</p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-bg-tertiary rounded-lg p-3">
                <div className="text-caption-sm text-text-muted">Solver</div>
                <div className="font-medium text-text-primary">{project.solver}</div>
              </div>
              <div className="bg-bg-tertiary rounded-lg p-3">
                <div className="text-caption-sm text-text-muted">Turbulence</div>
                <div className="font-medium text-text-primary">{project.turbulenceModel}</div>
              </div>
              <div className="bg-bg-tertiary rounded-lg p-3">
                <div className="text-caption-sm text-text-muted">Fluid</div>
                <div className="font-medium text-text-primary truncate">{project.fluidProperties}</div>
              </div>
            </div>

            <div className="border-t border-border-subtle pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-display-sm font-semibold text-text-primary">{project.meshCount}</div>
                  <div className="text-caption-sm text-text-muted">Meshes</div>
                </div>
                <div>
                  <div className="text-display-sm font-semibold text-text-primary">{project.simulationCount}</div>
                  <div className="text-caption-sm text-text-muted">Simulations</div>
                </div>
                <div>
                  <div className="text-caption-sm font-medium text-text-primary font-mono">{project.updatedAt}</div>
                  <div className="text-caption-sm text-text-muted">Updated</div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ─── Create Project Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        size="md"
      >
        <form onSubmit={handleCreateProject} className="space-y-5">
          <Input
            label="Project Name"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            placeholder="Enter project name"
            required
          />
          <Textarea
            label="Description"
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            rows={3}
            placeholder="Describe your CFD project"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Solver"
              value={newProject.solver}
              onChange={(e) => setNewProject({ ...newProject, solver: e.target.value })}
              options={solvers.map((s) => ({ value: s.id, label: `${s.name} (${s.version})` }))}
            />
            <Select
              label="Turbulence Model"
              value={newProject.turbulenceModel}
              onChange={(e) => setNewProject({ ...newProject, turbulenceModel: e.target.value })}
              options={turbulenceModels.map((m) => ({ value: m.id, label: m.name }))}
            />
          </div>
          <Select
            label="Fluid Properties"
            value={newProject.fluidProperties}
            onChange={(e) => setNewProject({ ...newProject, fluidProperties: e.target.value })}
            options={[
              { value: 'air', label: 'Air (ρ=1.225, μ=1.789e-5)' },
              { value: 'water', label: 'Water (ρ=998, μ=1.002e-3)' },
              { value: 'custom', label: 'Custom...' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Project</Button>
          </div>
        </form>
      </Modal>

      {/* ─── Detail Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showDetailModal && !!selectedProject}
        onClose={() => { setShowDetailModal(false); setSelectedProject(null); }}
        title={selectedProject?.name}
        size="lg"
      >
        {!selectedProject ? null : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-heading-sm text-text-primary border-b border-border-subtle pb-2">Description</h4>
                <p className="text-body text-text-muted">{selectedProject.description}</p>
              </div>
              <div className="space-y-4">
                <h4 className="text-heading-sm text-text-primary border-b border-border-subtle pb-2">Configuration</h4>
                <div className="space-y-3">
                  <DetailItem label="Solver" value={selectedProject.solver} />
                  <DetailItem label="Turbulence Model" value={selectedProject.turbulenceModel} />
                  <DetailItem label="Fluid Properties" value={selectedProject.fluidProperties} />
                  <DetailItem label="Status" value={<Badge variant={getStatusVariant(selectedProject.status)}>{getStatusLabel(selectedProject.status)}</Badge>} />
                  <DetailItem label="Created" value={selectedProject.createdAt} />
                  <DetailItem label="Updated" value={selectedProject.updatedAt} />
                </div>
              </div>
            </div>

            <div className="border-t border-border-subtle pt-6">
              <h4 className="text-heading-sm text-text-primary mb-4">Statistics</h4>
              <div className="grid grid-cols-3 gap-4">
                <StatItem value={selectedProject.meshCount} label="Meshes" />
                <StatItem value={selectedProject.simulationCount} label="Simulations" />
                <StatItem value={selectedProject.updatedAt} label="Last Updated" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
              <Button variant="secondary">Edit Project</Button>
              <Button variant="primary">Open Project</Button>
            </div>
          </div>
        )}
      </Modal>
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

function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-bg-tertiary rounded-lg p-4 text-center">
      <div className="text-display-sm font-semibold text-text-primary">{value}</div>
      <div className="text-caption-sm text-text-muted">{label}</div>
    </div>
  )
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'active':
    case 'completed':
      return 'success'
    case 'draft':
      return 'info'
    case 'archived':
      return 'default'
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