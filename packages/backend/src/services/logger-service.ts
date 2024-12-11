/**
 * @author axel7083
 */
import type { Disposable, Webview } from '@podman-desktop/api';
import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Logger } from '../utils/logger';

interface Dependencies {
  webview: Webview;
}

export class LoggerService implements Disposable {
  #registry: Map<string, Logger>;

  constructor(protected dependencies: Dependencies) {
    this.#registry = new Map();
  }

  protected createID(): string {
    return randomUUID().toString();
  }

  getLogs(loggerId: string): string {
    const logger = this.#registry.get(loggerId);
    if (!logger) throw new Error(`unknown logger with id ${loggerId}`);
    return logger.all();
  }

  createLogger(process: ChildProcess): string {
    const loggerId = this.createID();

    const logger = new Logger({
      webview: this.dependencies.webview,
      process: process,
      loggerId: loggerId,
    });
    this.#registry.set(loggerId, logger);
    // async init
    logger.init().catch(console.error);

    return loggerId;
  }

  dispose(): void {
    this.#registry.forEach(value => value.dispose());
  }
}
