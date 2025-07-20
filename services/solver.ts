export class SolverWorker {
  worker: Worker;
  loaded: boolean = false;

  constructor(worker: Worker) {
    this.worker = worker;
  }

  private postAction(action: string, payload?: any) {
    this.worker.postMessage({ action, payload });
  }

  load() {
    if (this.loaded) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const onMessage = (e: MessageEvent) => {
        if (e.data.action === 'load_success') {
          this.loaded = true;
          this.worker.removeEventListener('message', onMessage);
          resolve();
        } else if (e.data.action === 'load_error') {
          this.worker.removeEventListener('message', onMessage);
          reject(e.data.payload);
        }
      };
      this.worker.addEventListener('message', onMessage);
      this.postAction('load');
    });
  }

  solve(matrix: number[][], sequences: number[][], bufferSize: number, options: any = {}) {
    if (!this.loaded) {
      throw new Error('SolverWorker must be loaded before use');
    }

    return new Promise<any>((resolve, reject) => {
      const onMessage = (e: MessageEvent) => {
        const { action, payload } = e.data;
        if (action === 'solve_success') {
          this.worker.removeEventListener('message', onMessage);
          resolve(payload);
        } else if (action === 'solve_error') {
          this.worker.removeEventListener('message', onMessage);
          reject(payload);
        }
      };
      this.worker.addEventListener('message', onMessage);
      this.postAction('solve', { matrix, sequences, bufferSize, options });
    });
  }
}

interface WWorker extends Worker {
  new (): WWorker;
}

export const createWorker = async (): Promise<SolverWorker> => {
  const Worker = (await import('./solver.worker')).default as WWorker;
  return new SolverWorker(new Worker());
};
