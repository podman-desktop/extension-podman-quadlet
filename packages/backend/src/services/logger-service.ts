/**
 * @author axel7083
 */
import type { Disposable, Webview } from '@podman-desktop/api';
import { randomUUID } from 'node:crypto';
import { LoggerImpl } from '../utils/logger-impl';

interface Dependencies {
  webview: Webview;
}

export class LoggerService implements Disposable {
  #registry: Map<string, LoggerImpl>;

  constructor(protected dependencies: Dependencies) {
    this.#registry = new Map();
  }

  protected createID(): string {
    return randomUUID().toString();
  }

  getLogs(loggerId: string): string {
    const logger = this.getLogger(loggerId);
    return logger.all();
  }

  getLogger(loggerId: string): LoggerImpl {
    const logger = this.#registry.get(loggerId);
    if (!logger) throw new Error(`unknown logger with id ${loggerId}`);
    return logger;
  }

  disposeLogger(loggerId: string): void {
    const logger = this.getLogger(loggerId);
    logger.dispose();
    this.#registry.delete(loggerId);
  }

  createLogger(): LoggerImpl {
    const loggerId = this.createID();

    const logger = new LoggerImpl({
      webview: this.dependencies.webview,
      loggerId: loggerId,
    });
    this.#registry.set(loggerId, logger);
    return logger;
  }

  dispose(): void {
    this.#registry.forEach(value => value.dispose());
  }
}
