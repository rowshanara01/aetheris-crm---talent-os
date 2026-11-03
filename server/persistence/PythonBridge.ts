import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { DashboardSnapshot } from '../../src/shared/types.ts';

const PYTHON_PORT = Number(process.env.PYTHON_CRM_PORT || 8001);
const PYTHON_BASE_URL = `http://127.0.0.1:${PYTHON_PORT}`;

class PythonBackendSupervisor {
  private proc: ChildProcess | null = null;
  private readyPromise: Promise<void> | null = null;

  constructor() {
    const shutdown = () => {
      if (this.proc && !this.proc.killed) {
        this.proc.kill('SIGTERM');
      }
    };
    process.on('exit', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  async ensureStarted(): Promise<void> {
    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = (async () => {
      // Check if already listening
      if (await this.pingHealth()) {
        return;
      }

      const scriptPath = path.resolve(process.cwd(), 'backend_python', 'crm_server.py');
      this.proc = spawn('python3', [scriptPath], {
        cwd: path.resolve(process.cwd(), 'backend_python'),
        env: { ...process.env, PYTHON_CRM_PORT: String(PYTHON_PORT) },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.proc.stdout?.on('data', (chunk: Buffer) => {
        process.stdout.write(chunk.toString());
      });
      this.proc.stderr?.on('data', (chunk: Buffer) => {
        process.stderr.write(chunk.toString());
      });
      this.proc.on('exit', () => {
        this.proc = null;
        this.readyPromise = null;
      });

      for (let attempt = 0; attempt < 30; attempt++) {
        if (await this.pingHealth()) {
          return;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error('Python 3 CRM backend failed to become healthy within 3 seconds.');
    })();

    return this.readyPromise;
  }

  private async pingHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${PYTHON_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async get<T>(route: string): Promise<T> {
    await this.ensureStarted();
    const res = await fetch(`${PYTHON_BASE_URL}${route}`);
    const data = (await res.json()) as T & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || `Python GET ${route} failed (${res.status})`);
    }
    return data;
  }

  async post<T>(route: string, payload: unknown): Promise<T> {
    await this.ensureStarted();
    const res = await fetch(`${PYTHON_BASE_URL}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as T & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || `Python POST ${route} failed (${res.status})`);
    }
    return data;
  }

  getSnapshot(): Promise<DashboardSnapshot> {
    return this.get<DashboardSnapshot>('/snapshot');
  }
}

export const pythonBridge = new PythonBackendSupervisor();
