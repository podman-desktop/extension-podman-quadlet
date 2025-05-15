/**********************************************************************
 * Copyright (C) 2025 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/
import type { CancellationToken, Disposable, Logger, RunResult } from '@podman-desktop/api';
import type { ConnectConfig } from 'ssh2';
import { Client } from 'ssh2';

export class PodmanSSH implements Disposable {
  #sshConfig: ConnectConfig;
  #client: Client;
  #connected: boolean = false;
  #reconnectTimeout: NodeJS.Timeout | undefined;

  constructor(sshConfig: ConnectConfig) {
    this.#sshConfig = sshConfig;
    this.#client = new Client();
  }

  dispose(): void {
    this.#client.end();
    this.#connected = false;

    // abort any reconnect tentative
    if (this.#reconnectTimeout) {
      clearTimeout(this.#reconnectTimeout);
      this.#reconnectTimeout = undefined;
    }
  }

  get connected(): boolean {
    return this.#connected;
  }

  async connect(): Promise<boolean> {
    console.warn('[PodmanSSH] connecting');

    const { resolve, reject, promise } = Promise.withResolvers<boolean>();
    this.#client
      .on('ready', () => {
        console.log(`[PodmanSSH] connection ready for ${this.#sshConfig.host}`);
        this.#connected = true;
        resolve(true);
      })
      .on('error', err => {
        console.error('Server error:', err);
        this.#connected = false;
        reject(false);
      })
      .connect(this.#sshConfig);

    this.#client.on('end', () => {
      console.warn('connection ended by remote host');
      this.#connected = false;
      this.handleReconnect();
    });

    this.#client.on('close', () => {
      console.warn('connection closed by remote host');
      this.#connected = false;
      this.handleReconnect();
    });

    return promise;
  }

  public exec(
    command: string,
    options?: {
      args?: string[];
      logger?: Logger;
      token?: CancellationToken;
      env?: Record<string, string>;
    },
  ): Promise<RunResult> {
    if (!this.#connected) {
      throw new Error(`cannot execute "${command}": not connected`);
    }

    const fullCommand = `${command} ${options?.args?.join(' ')}`;
    console.log(`[PodmanSSH] start executing command ${command} for host ${this.#sshConfig.host}`);

    const { promise, reject, resolve } = Promise.withResolvers<RunResult>();
    this.#client.exec(
      fullCommand,
      {
        env: options?.env,
      },
      (error, channel) => {
        if (error) {
          console.warn(`something went wrong while tryng to execute ${fullCommand}:`, error);
          reject(error);
          return;
        }

        // handle the cancellation token if defined
        options?.token?.onCancellationRequested(() => {
          console.warn(`[PodmanSSH] received cancellation request for ${fullCommand}`);
          if (channel.closed) {
            console.warn('[PodmanSSH] channel is already closed: ignoring');
            return;
          }
          channel.close();
        });

        let stdout = '';
        let stderr = '';

        channel.stdout.on('data', (chunk: string) => {
          options?.logger?.log(chunk);
          stdout += chunk;
        });

        channel.stderr.on('data', (chunk: string) => {
          options?.logger?.error(chunk);
          stderr += chunk;
        });

        channel.on('exit', code => {
          if (code === 0) {
            resolve({
              stdout,
              stderr,
              command: fullCommand,
            });
          } else {
            reject({
              exitCode: code,
              stdout,
              stderr,
              command: fullCommand,
            });
          }
        });
      },
    );

    return promise;
  }

  handleReconnect(): void {
    // need to reconnect if no timeout is set for now
    if (!this.#reconnectTimeout) {
      this.#reconnectTimeout = setTimeout(() => {
        this.#reconnectTimeout = undefined;
        this.connect().catch(console.error);
      }, 5_000);
    }
  }
}
