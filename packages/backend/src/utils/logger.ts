/**
 * @author axel7083
 */
import type { ChildProcess } from 'node:child_process';
import type { AsyncInit } from './async-init';
import { Disposable, type Webview } from '@podman-desktop/api';
import { Messages } from '/@shared/src/messages';

interface Dependencies {
  process: ChildProcess;
  webview: Webview;
  maxLogsLengths?: number;
  loggerId: string;
}

const DEFAULT_MAX_LOGS_LENGTH = 200;

export class Logger implements AsyncInit, Disposable {
  #disposables: Disposable[] = [];
  #logs: string[] = [];

  constructor(protected dependencies: Dependencies) {}

  all(): string {
    return this.#logs.reduce((output, current) => {
      return output + current;
    }, '');
  }

  protected disposeProcess(): void {
    if (
      !this.dependencies.process.killed ||
      !this.dependencies.process.exitCode ||
      this.dependencies.process.connected
    ) {
      console.warn(`killing process (${this.dependencies.process.pid})`);
      this.dependencies.process.kill();
    }
  }

  dispose(): void {
    this.#disposables.forEach(disposable => disposable.dispose());
    this.#logs = [];

    // if the logger is disposed, we should the process too.
    this.disposeProcess();
  }

  protected onData(chunk: Buffer): void {
    const str = chunk.toString();
    this.#logs.push(str);
    this.notify(str); // notify frontend

    if (this.#logs.length > (this.dependencies.maxLogsLengths ?? DEFAULT_MAX_LOGS_LENGTH)) {
      this.#logs.shift();
    }
    console.log('[Logger] onData got', this.#logs.length);
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

  async init(): Promise<void> {
    const binding = this.onData.bind(this);

    // add listener to stdout data
    this.dependencies.process.stdout?.on('data', binding);
    this.#disposables.push(
      Disposable.create(() => {
        this.dependencies.process.stdout?.removeListener('data', binding);
      }),
    );

    // add listener to stderr data
    this.dependencies.process.stderr?.on('data', binding);
    this.#disposables.push(
      Disposable.create(() => {
        this.dependencies.process.stderr?.removeListener('data', binding);
      }),
    );
  }
}
