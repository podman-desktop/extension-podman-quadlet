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
import type { ConnectConfig } from 'ssh2';
import SftpClient from 'ssh2-sftp-client';
import { dirname } from 'node:path/posix';
import { ConnectionHandler } from './connection-handler';

export class PodmanSFTP extends ConnectionHandler {
  #sshConfig: ConnectConfig;
  #client: SftpClient;
  #connected: boolean = false;

  constructor(sshConfig: ConnectConfig) {
    super();
    this.#sshConfig = sshConfig;
    this.#client = new SftpClient();
  }

  override dispose(): void {
    super.dispose();

    this.#client.end().catch(console.error);
    this.#connected = false;
  }

  get connected(): boolean {
    return this.#connected;
  }

  async connect(): Promise<boolean> {
    console.warn('[PodmanSFTP] connecting');

    try {
      await this.#client.connect(this.#sshConfig);
      this.#connected = true;
    } catch (err: unknown) {
      console.error('Something went wrong while trying to connect to podman connection', err);
    }

    this.#client.on('error', () => {
      this.#connected = false;
    });

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

    return this.#connected;
  }

  protected resolve(path: string): string {
    return path.replace('~', `/home/${this.#sshConfig.username}`);
  }

  async read(path: string): Promise<string> {
    const response = await this.#client.get(this.resolve(path));

    if (Buffer.isBuffer(response)) {
      return response.toString('utf8');
    }

    if (typeof response !== 'string') throw new Error('PodmanSFTP read operation cannot handle writable stream');
    return response;
  }

  /**
   * Returns the real path of the given path.
   */
  async realpath(path: string): Promise<string> {
    const response = await this.#client.realPath(this.resolve(path));
    return response;
  }

  async write(destination: string, content: string): Promise<void> {
    // resolve path (replace ~ with /home/{username}
    const resolved = this.resolve(destination);

    // create parent directory
    await this.#client.mkdir(dirname(resolved), true);
    // put the file
    await this.#client.put(Buffer.from(content, 'utf8'), resolved);
  }

  async rm(path: string): Promise<void> {
    await this.#client.delete(this.resolve(path));
  }
}
