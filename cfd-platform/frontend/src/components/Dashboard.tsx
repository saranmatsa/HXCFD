import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Badge,
  ProgressBar,
  Table,
  EmptyState,
  Avatar,
} from './ui/DesignSystem'

// ─── Types ────────────────────────────────────────────────────────────
interface Project {
  id: string
  name: string
  description: string
  solver: string
  status: string
  meshCount: number
  simulationCount: number
  updatedAt: string
}

interface Mesh {
  id: string
  name: string
  projectId: string
  format: string
  status: string
  elementCount: number
  nodeCount: number
  createdAt: string
}

interface Simulation {
  id: string
  name: string
  projectId: string
  meshId: string
  solverType: string
  status: string
  progress: number
  currentIteration: number
  maxIterations: number
  createdAt: string
}

interface Stats {
  totalProjects: number
  totalMeshes: number
  totalSimulations: number
  runningSimulations: number
  completedSimulations: number
  failedSimulations: number
  totalCpuHours: number
}

// ─── Component ────────────────────────────────────────────────────────
export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    totalMeshes: 0,
    totalSimulations: 0,
    runningSimulations: 0,
    completedSimulations: 0,
    failedSimulations: 0,
    totalCpuHours: 0,
  })
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [recentMeshes, setRecentMeshes] = useState<Mesh[]>([])
  const [recentSimulations, setRecentSimulations] = useState<Simulation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for preview
    const mockStats: Stats = {
      totalProjects: 12,
      totalMeshes: 45,
      totalSimulations: 78,
      runningSimulations: 3,
      completedSimulations: 65,
      failedSimulations: 10,
      totalCpuHours: 1247.5,
    }

    const mockProjects: Project[] = [
      { id: '1', name: 'Airfoil Analysis', description: 'NACA 0012 airfoil at various angles of attack', solver: 'OpenFOAM', status: 'active', meshCount: 5, simulationCount: 12, updatedAt: '2024-01-15' },
      { id: '2', name: 'Pipe Flow', description: 'Turbulent flow in a 90-degree pipe bend', solver: 'OpenFOAM', status: 'active', meshCount: 3, simulationCount: 8, updatedAt: '2024-01-14' },
      { id: '3', name: 'Heat Exchanger', description: 'Shell and tube heat exchanger optimization', solver: 'OpenFOAM', status: 'completed', meshCount: 4, simulationCount: 15, updatedAt: '2024-01-10' },
      { id: '4', name: 'Car Aerodynamics', description: 'External aerodynamics of sedan vehicle', solver: 'OpenFOAM', status: 'active', meshCount: 6, simulationCount: 22, updatedAt: '2024-01-12' },
      { id: '5', name: 'Turbine Blade', description: 'Gas turbine blade cooling analysis', solver: 'OpenFOAM', status: 'draft', meshCount: 2, simulationCount: 5, updatedAt: '2024-01-08' },
    ]

    const mockMeshes: Mesh[] = [
      { id: '1', name: 'Airfoil Mesh - Fine', projectId: '1', format: 'GMSH', status: 'completed', elementCount: 245000, nodeCount: 48500, createdAt: '2024-01-15' },
      { id: '2', name: 'Pipe Bend Mesh', projectId: '2', format: 'GMSH', status: 'completed', elementCount: 180000, nodeCount: 35000, createdAt: '2024-01-14' },
      { id: '3', name: 'Heat Exchanger Mesh', projectId: '3', format: 'GMSH', status: 'completed', elementCount: 320000, nodeCount: 62000, createdAt: '2024-01-10' },
      { id: '4', name: 'Car Body Mesh', projectId: '4', format: 'GMSH', status: 'generating', elementCount: 0, nodeCount: 0, createdAt: '2024-01-12' },
      { id: '5', name: 'Turbine Blade Mesh', projectId: '5', format: 'GMSH', status: 'completed', elementCount: 150000, nodeCount: 28000, createdAt: '2024-01-08' },
    ]

    const mockSimulations: Simulation[] = [
      { id: '1', name: 'Airfoil AoA 5deg', projectId: '1', meshId: '1', solverType: 'OpenFOAM', status: 'running', progress: 65, currentIteration: 650, maxIterations: 1000, createdAt: '2024-01-15' },
      { id: '2', name: 'Pipe Flow Re=50000', projectId: '2', meshId: '2', solverType: 'OpenFOAM', status: 'running', progress: 42, currentIteration: 420, maxIterations: 1000, createdAt: '2024-01-14' },
      { id: '3', name: 'Car Aerodynamics - 60mph', projectId: '4', meshId: '4', solverType: 'OpenFOAM', status: 'pending', progress: 0, currentIteration: 0, maxIterations: 2000, createdAt: '2024-01-12' },
      { id: '4', name: 'Heat Exchanger - Design 1', projectId: '3', meshId: '3', solverType: 'OpenFOAM', status: 'completed', progress: 100, currentIteration: 1000, maxIterations: 1000, createdAt: '2024-01-10' },
      { id: '5', name: 'Turbine Blade - Cooling', projectId: '5', meshId: '5', solverType: 'OpenFOAM', status: 'failed', progress: 78, currentIteration: 780, maxIterations: 1000, createdAt: '2024-01-08' },
    ]

    setTimeout(() => {
      setStats(mockStats)
      setRecentProjects(mockProjects)
      setRecentMeshes(mockMeshes)
      setRecentSimulations(mockSimulations)
      setLoading(false)
    }, 500)
  }, [])

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'running':
        return 'success'
      case 'pending':
      case 'generating':
        return 'warning'
      case 'failed':
        return 'error'
      case 'draft':
        return 'info'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-20 bg-bg-tertiary rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-bg-tertiary rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-bg-tertiary rounded-xl" />
            <div className="h-80 bg-bg-tertiary rounded-xl" />
            <div className="h-80 bg-bg-tertiary rounded-xl lg:col-span-2" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard p-6 space-y-6">
      {/* ─── Stats Grid ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        <StatCard
          icon={<FolderIcon />}
          label="Total Projects"
          value={stats.totalProjects}
          color="blue"
        />
        <StatCard
          icon={<MeshIcon />}
          label="Total Meshes"
          value={stats.totalMeshes}
          color="amber"
        />
        <StatCard
          icon={<CpuIcon />}
          label="Total Simulations"
          value={stats.totalSimulations}
          color="purple"
        />
        <StatCard
          icon={<PlayIcon />}
          label="Running"
          value={stats.runningSimulations}
          color="green"
        />
        <StatCard
          icon={<CheckIcon />}
          label="Completed"
          value={stats.completedSimulations}
          color="emerald"
        />
        <StatCard
          icon={<AlertIcon />}
          label="Failed"
          value={stats.failedSimulations}
          color="red"
        />
        <StatCard
          icon={<ClockIcon />}
          label="CPU Hours"
          value={stats.totalCpuHours.toFixed(1)}
          color="cyan"
        />
      </section>

      {/* ─── Recent Projects ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-heading-md text-text-primary">Recent Projects</h3>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
        <Table
          columns={[
            { key: 'name', header: 'Name', render: (p) => (
              <div>
                <div className="font-medium text-text-primary">{p.name}</div>
                <div className="text-caption-sm text-text-muted">{p.description}</div>
              </div>
            )},
            { key: 'solver', header: 'Solver', render: (p) => <span className="px-2 py-0.5 text-caption-sm bg-bg-tertiary rounded">{p.solver}</span> },
            { key: 'status', header: 'Status', render: (p) => <Badge variant={getStatusVariant(p.status)}>{getStatusLabel(p.status)}</Badge> },
            { key: 'meshCount', header: 'Meshes', className: 'text-right' },
            { key: 'simulationCount', header: 'Simulations', className: 'text-right' },
            { key: 'updatedAt', header: 'Updated', className: 'font-mono text-text-muted' },
          ]}
          data={recentProjects}
          keyField="id"
          hoverable
        />
      </section>

      {/* ─── Meshes & Simulations Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-heading-md text-text-primary">Recent Meshes</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'projectId', header: 'Project' },
              { key: 'format', header: 'Format', render: (m) => <Badge variant="info" size="sm">{m.format}</Badge> },
              { key: 'status', header: 'Status', render: (m) => <Badge variant={getStatusVariant(m.status)} size="sm">{getStatusLabel(m.status)}</Badge> },
              { key: 'elementCount', header: 'Elements', className: 'text-right font-mono', render: (m) => m.elementCount.toLocaleString() },
              { key: 'nodeCount', header: 'Nodes', className: 'text-right font-mono', render: (m) => m.nodeCount.toLocaleString() },
            ]}
            data={recentMeshes}
            keyField="id"
            hoverable
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-heading-md text-text-primary">Recent Simulations</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'solverType', header: 'Solver', render: (s) => <Badge variant="info" size="sm">{s.solverType}</Badge> },
              { key: 'status', header: 'Status', render: (s) => <Badge variant={getStatusVariant(s.status)} size="sm">{getStatusLabel(s.status)}</Badge> },
              { key: 'progress', header: 'Progress', render: (s) => (
                <div className="w-32">
                  <ProgressBar value={s.progress} size="sm" showLabel />
                </div>
              )},
              { key: 'currentIteration', header: 'Iteration', className: 'font-mono', render: (s) => `${s.currentIteration} / ${s.maxIterations}` },
            ]}
            data={recentSimulations}
            keyField="id"
            hoverable
          />
        </section>
      </div>

      {/* ─── Quick Actions ──────────────────────────────────────────── */}
      <section className="space-y-4 pt-2">
        <h3 className="text-heading-md text-text-primary">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" icon={<PlusIcon />} iconPosition="left">
            New Project
          </Button>
          <Button variant="secondary" icon={<MeshIcon />} iconPosition="left">
            Generate Mesh
          </Button>
          <Button variant="secondary" icon={<PlayIcon />} iconPosition="left">
            Run Simulation
          </Button>
          <Button variant="secondary" icon={<ChartIcon />} iconPosition="left">
            View Results
          </Button>
        </div>
      </section>
    </div>
  )
}

// ─── Helper Components ──────────────────────────────────────────────

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number | string
  color: 'blue' | 'amber' | 'purple' | 'green' | 'emerald' | 'red' | 'cyan'
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorStyles = {
    blue: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
    amber: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
    purple: 'bg-accent-purple/20 text-accent-purple border-accent-purple/30',
    green: 'bg-accent-green/20 text-accent-green border-accent-green/30',
    emerald: 'bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30',
    red: 'bg-accent-red/20 text-accent-red border-accent-red/30',
    cyan: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
  }

  return (
    <Card padding="md" className="flex items-center gap-4">
      <div className={twMerge('w-12 h-12 rounded-xl flex items-center justify-center', colorStyles[color])}>
        {icon}
      </div>
      <div>
        <div className="text-caption text-text-muted">{label}</div>
        <div className="text-display-sm font-semibold text-text-primary">{value}</div>
      </div>
    </Card>
  )
}

// ─── Icons ──────────────────────────────────────────────────────────

function FolderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
      <path d="M3 9h18" />
    </svg>
  )
}

function MeshIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16v16H4z" />
      <path d="M4 12h16" />
      <path d="M12 4v16" />
    </svg>
  )
}

function CpuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <path d="M9 1v3m6-3v3M9 20v3m6-3v3M1 9h3m16 0h3M1 15h3m16 0h3" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 5h5v5H5zM14 14h5v5h-5zM7.5 10v2a2 2 0 0 0 2 2H14" />
      <path d="m12 17 2 2 2-2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
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