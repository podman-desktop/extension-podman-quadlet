/**
 * @author axel7083
 */
import type { LoggerApi } from '/@shared/src/apis/logger-api';
import type { RpcBrowser, Subscriber } from '/@shared/src/messages/message-proxy';
import { Messages } from '/@shared/src/messages';
import { writable } from 'svelte/store';
import type { Writable, Unsubscriber, Readable } from 'svelte/store';

interface Dependencies {
  loggerId: string;
  loggerAPI: LoggerApi;
  rpcBrowser: RpcBrowser;
}

export class LoggerStore implements Readable<string> {
  readonly #store: Writable<string>;
  #subscriber: Subscriber | undefined;

  constructor(protected dependencies: Dependencies) {
    this.#store = writable('');
  }

  subscribe(run: (value: string) => void, invalidate?: (value?: string) => void): Unsubscriber {
    return this.#store.subscribe(run, invalidate);
  }

  async init(): Promise<void> {
    const logs = await this.dependencies.loggerAPI.getLogs(this.dependencies.loggerId);
    this.#store.set(logs);

    this.#subscriber = this.dependencies.rpcBrowser.subscribe(
      Messages.LOGGER_DATA,
      ({ loggerId, value }: { loggerId: string; value: string }) => {
        console.log('[LoggerStore] received message Messages.LOGGER_DATA', loggerId, value);
        if (loggerId !== this.dependencies.loggerId) return;

        this.#store.update(current => `${current}${value}`);
      },
    );
  }

  dispose(): void {
    this.#store.set(''); // clean store content
    this.#subscriber?.unsubscribe();
  }
}
