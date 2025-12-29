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
import type {
  Logger,
  CancellationToken,
  RunResult,
  ProviderContainerConnection,
  process as ProcessApi,
} from '@podman-desktop/api';
import { PodmanWorker } from './podman-worker';
import { homedir } from 'node:os';
import { mkdir, readFile, rm, writeFile, realpath } from 'node:fs/promises';
import { dirname } from 'node:path/posix';

export class PodmanNativeWorker extends PodmanWorker {
  constructor(
    connection: ProviderContainerConnection,
    protected processApi: typeof ProcessApi,
  ) {
    super(connection);
  }

  override read(path: string): Promise<string> {
    return readFile(path, { encoding: 'utf8' });
  }

  override rm(path: string): Promise<void> {
    return rm(path, { recursive: false, force: false });
  }

  override async write(path: string, content: string): Promise<void> {
    // 1. resolve homedir
    const resolved = path.replace('~', homedir());
    // 2. mkdir parent directory
    await mkdir(dirname(resolved), { recursive: true });
    // 3. write file
    await writeFile(resolved, content, { encoding: 'utf8' });
  }

  override async realPath(path: string): Promise<string> {
    return realpath(path);
  }

  override exec(
    command: string,
    options?: {
      args?: string[];
      logger?: Logger;
      token?: CancellationToken;
      env?: Record<string, string>;
    },
  ): Promise<RunResult> {
    return this.processApi.exec(command, options?.args, {
      logger: options?.logger,
      env: options?.env,
      token: options?.token,
    });
  }

  override dispose(): void {}

  override async init(): Promise<void> {
    if (this.connection.connection.vmType) throw new Error('PodmanNativeWorker cannot deal with podman machines');
  }
}
