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

import type { Logger, CancellationToken, RunResult, ProviderContainerConnection } from '@podman-desktop/api';
import { PodmanWorker } from './podman-worker';
import type { ConnectConfig } from 'ssh2';
import { PodmanSFTP } from '../remote/podman-sftp';
import { PodmanSSH } from '../remote/podman-ssh';

export class PodmanSSHWorker extends PodmanWorker {
  #podmanSFTP: PodmanSFTP;
  #podmanSSH: PodmanSSH;

  constructor(
    connection: ProviderContainerConnection,
    protected sshConfig: ConnectConfig,
  ) {
    super(connection);
    this.#podmanSFTP = new PodmanSFTP(sshConfig);
    this.#podmanSSH = new PodmanSSH(sshConfig);
  }

  override read(path: string): Promise<string> {
    return this.#podmanSFTP.read(path);
  }

  override rm(path: string): Promise<void> {
    return this.#podmanSFTP.rm(path);
  }

  override write(path: string, content: string): Promise<void> {
    return this.#podmanSFTP.write(path, content);
  }

  override realPath(path: string): Promise<string> {
    return this.#podmanSFTP.realpath(path);
  }

  override exec(
    command: string,
    options?: { args?: string[]; logger?: Logger; token?: CancellationToken; env?: Record<string, string> },
  ): Promise<RunResult> {
    return this.#podmanSSH.exec(command, options);
  }

  override dispose(): void {
    this.#podmanSFTP.dispose();
    this.#podmanSSH.dispose();
  }

  override async init(): Promise<void> {
    await Promise.all([this.#podmanSFTP.connect(), this.#podmanSSH.connect()]);
  }
}
