import type { SandboxState, CommandResult } from './types';

interface StartupScript {
  id: string
  name: string
  content: string
  description?: string
  createdAt: string
  lastUsed?: string
}

/**
 * In-memory storage for demo purposes
 * In production, this would be replaced with Durable Objects or KV storage
 */
export class SandboxStorage {
  private sandboxes = new Map<string, SandboxState>();
  private commandHistory = new Map<string, CommandResult[]>();
  private startupScripts = new Map<string, StartupScript>();

  getSandbox(id: string): SandboxState | undefined {
    return this.sandboxes.get(id);
  }

  setSandbox(id: string, sandbox: SandboxState): void {
    this.sandboxes.set(id, sandbox);
  }

  deleteSandbox(id: string): void {
    this.sandboxes.delete(id);
    this.commandHistory.delete(id);
  }

  getAllSandboxes(): SandboxState[] {
    return Array.from(this.sandboxes.values());
  }

  getCommandHistory(sandboxId: string): CommandResult[] {
    return this.commandHistory.get(sandboxId) || [];
  }

  addCommandToHistory(sandboxId: string, command: CommandResult): void {
    const history = this.commandHistory.get(sandboxId) || [];
    history.unshift(command);
    
    // Keep only the last 100 commands
    if (history.length > 100) {
      history.pop();
    }
    
    this.commandHistory.set(sandboxId, history);
  }

  updateSandboxActivity(sandboxId: string): void {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) {
      sandbox.lastActivity = new Date().toISOString();
      this.sandboxes.set(sandboxId, sandbox);
    }
  }

  updateSandboxMetrics(sandboxId: string, executionTime: number): void {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) {
      sandbox.metrics.totalCommands++;
      sandbox.metrics.avgCommandTime = 
        (sandbox.metrics.avgCommandTime * (sandbox.metrics.totalCommands - 1) + executionTime) / 
        sandbox.metrics.totalCommands;
      this.sandboxes.set(sandboxId, sandbox);
    }
  }

  // Startup Scripts methods
  getStartupScript(id: string): StartupScript | undefined {
    return this.startupScripts.get(id);
  }

  setStartupScript(id: string, script: StartupScript): void {
    this.startupScripts.set(id, script);
  }

  deleteStartupScript(id: string): void {
    this.startupScripts.delete(id);
  }

  getStartupScripts(): StartupScript[] {
    return Array.from(this.startupScripts.values());
  }
}

// Global storage instance
export const storage = new SandboxStorage();