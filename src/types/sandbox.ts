export interface SandboxEnvironment {
  id: string;
  name: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  createdAt: Date;
  lastActivity: Date;
  metrics: SandboxMetrics;
  processes: RunningProcess[];
  exposedPorts: ExposedPort[];
  files: FileNode[];
  startupScript?: string;
}

export interface SandboxMetrics {
  creationTime: number; // milliseconds
  totalCommands: number;
  avgCommandTime: number;
  p99CommandTime: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface RunningProcess {
  id: string;
  command: string;
  pid: number;
  status: 'running' | 'stopped' | 'error';
  startTime: Date;
  logs: LogEntry[];
}

export interface ExposedPort {
  port: number;
  previewUrl: string;
  protocol: 'http' | 'https';
  status: 'active' | 'inactive';
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified: Date;
  children?: FileNode[];
}

export interface FileApiResponse {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified: string;
}

export interface ProcessApiResponse {
  id: string;
  command: string;
  pid: number;
  status: 'running' | 'stopped' | 'error';
  startTime: string;
  logs?: LogEntry[];
}

export interface PortApiResponse {
  port: number;
  previewUrl: string;
  protocol: 'http' | 'https';
  status: 'active' | 'inactive';
}

export interface TimeSeriesDataPoint {
  time: string;
  cpu: number;
  memory: number;
  commandTime: number;
}

export interface CommandStat {
  command: string;
  count: number;
  avgTime: number;
  successRate: number;
}

export interface TerminalEntry {
  id: string;
  type: 'command' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
  executionTime?: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: 'system' | 'process' | 'command';
}

export interface CommandResult {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  timestamp: Date;
}

export interface StartupScript {
  id: string;
  name: string;
  content: string;
  description?: string;
  createdAt: Date;
  lastUsed?: Date;
}

export interface GlobalMetrics {
  totalSandboxes: number;
  activeSandboxes: number;
  avgCreationTime: number;
  p99CreationTime: number;
  totalCommands: number;
  avgCommandTime: number;
  successRate: number;
}