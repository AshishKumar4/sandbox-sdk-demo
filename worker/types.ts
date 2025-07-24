export interface SandboxMetrics {
  creationTime: number;
  totalCommands: number;
  avgCommandTime: number;
  uptime: number;
}

export interface ProcessInfo {
  id: string;
  pid: number;
  command: string;
  status: string;
}

export interface ExposedPort {
  port: number;
  url: string;
  name?: string;
}

export interface SandboxState {
  id: string;
  name: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  createdAt: string;
  lastActivity: string;
  metrics: SandboxMetrics;
  processes: ProcessInfo[];
  exposedPorts: ExposedPort[];
}

export interface CommandResult {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  timestamp: string;
}

export interface CreateSandboxRequest {
  name: string;
  startupScript?: string;
}

export interface ExecuteCommandRequest {
  command: string;
}

export interface StreamCommandRequest {
  command: string;
}

export interface WriteFileRequest {
  path: string;
  content: string;
}

export interface ReadFileParams {
  sandboxId: string;
  filePath: string;
}

export interface GitCloneRequest {
  repoUrl: string;
  branch?: string;
  targetDir?: string;
}

export interface StartProcessRequest {
  command: string;
}

export interface ExposePortRequest {
  port: number;
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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  lastModified: string;
}

export interface Env {
  Sandbox: any;
}