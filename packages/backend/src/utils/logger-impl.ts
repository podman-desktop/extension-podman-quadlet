/**
 * @author axel7083
 */
import type { Disposable, Webview, Logger as ILogger, CancellationToken } from '@podman-desktop/api';
import { CancellationTokenSource } from '@podman-desktop/api';
import { Messages } from '/@shared/src/messages';

interface Dependencies {
  webview: Webview;
  maxLogsLengths?: number;
  loggerId: string;
}

const DEFAULT_MAX_LOGS_LENGTH = 200;

export class LoggerImpl implements Disposable, ILogger {
  #logs: string[] = [];
  #tokenSource: CancellationTokenSource | undefined;

  get id(): string {
    return this.dependencies.loggerId;
  }

  get token(): CancellationToken {
    if (!this.#tokenSource) throw new Error('logger has been disposed');
    return this.#tokenSource?.token;
  }

  constructor(protected dependencies: Dependencies) {
    this.#tokenSource = new CancellationTokenSource();
  }

  log(...data: unknown[]): void {
    return this.onData(data);
  }
  error(...data: unknown[]): void {
    return this.onData(data);
  }
  warn(...data: unknown[]): void {
    return this.onData(data);
  }

  protected onData(...data: unknown[]): void {
    if (this.#tokenSource?.token.isCancellationRequested) return;
    data.forEach((data: unknown) => {
      this.append(String(data));
    });
  }

  all(): string {
    return this.#logs.reduce((output, current) => {
      return output + current;
    }, '');
  }

  dispose(): void {
    this.#tokenSource?.cancel();
    this.#tokenSource?.dispose();
    this.#tokenSource = undefined;
    this.#logs = [];
  }

  protected append(content: string): void {
    this.#logs.push(content);
    this.notify(content); // notify frontend

    if (this.#logs.length > (this.dependencies.maxLogsLengths ?? DEFAULT_MAX_LOGS_LENGTH)) {
      this.#logs.shift();
    }
  }

  protected notify(str: string): void {
    this.dependencies.webview
      .postMessage({
        id: Messages.LOGGER_DATA,
        body: {
          value: str,
          loggerId: this.dependencies.loggerId,
        },
      })
      .catch(console.error);
  }
}
