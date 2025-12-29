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
import type { Logger, CancellationToken, RunResult, ProviderContainerConnection, RunError } from '@podman-desktop/api';
import { PodmanWorker } from './podman-worker';

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { QuadletBinaryResolver } from '../quadlet-binary-resolver';

const WSL_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    vmType: 'WSL',
    name: 'podman-machine-default',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const RUN_RESULT_MOCK: RunResult = {
  command: 'foo-bar',
  stdout: 'foo',
  stderr: 'bar',
};

const RUN_ERROR_MOCK: RunError = {
  ...RUN_RESULT_MOCK,
  exitCode: 1,
  cancelled: false,
  killed: false,
  name: 'foo',
  cause: 'unknown',
  stack: undefined,
  message: 'error',
};

const QUADLET_BINARY_PATH_MOCK = '/usr/libexec/podman/quadlet';

vi.mock(import('../quadlet-binary-resolver'))

class PodmanWorkerImpl extends PodmanWorker {
  constructor(
    connection: ProviderContainerConnection,
    public callbacks: {
      read: (path: string) => Promise<string>;
      rm: (path: string) => Promise<void>;
      write: (path: string, content: string) => Promise<void>;
      realpath: (path: string) => Promise<string>;
      exec: (
        command: string,
        options?: { args?: string[]; logger?: Logger; token?: CancellationToken; env?: Record<string, string> },
      ) => Promise<RunResult>;
    },
  ) {
    super(connection);
  }

  override realPath(path: string): Promise<string> {
    return this.callbacks.realpath(path);
  }

  override read(path: string): Promise<string> {
    return this.callbacks.read(path);
  }
  override rm(path: string): Promise<void> {
    return this.callbacks.rm(path);
  }
  override write(path: string, content: string): Promise<void> {
    return this.callbacks.write(path, content);
  }
  override exec(
    command: string,
    options?: { args?: string[]; logger?: Logger; token?: CancellationToken; env?: Record<string, string> },
  ): Promise<RunResult> {
    return this.callbacks.exec(command, options);
  }
  override dispose(): void {}
  override async init(): Promise<void> {}
}

beforeEach(() => {
  vi.resetAllMocks();
});

function getPodmanWorkerImpl(): PodmanWorkerImpl {
  return new PodmanWorkerImpl(WSL_PROVIDER_CONNECTION_MOCK, {
    read: vi.fn(),
    exec: vi.fn(),
    write: vi.fn(),
    rm: vi.fn(),
    realpath: vi.fn(),
  });
}

describe('systemctlExec', () => {
  test('RunResult should passthrough', async () => {
    const worker = getPodmanWorkerImpl();

    vi.mocked(worker.callbacks.exec).mockResolvedValue(RUN_RESULT_MOCK);

    const result = await worker.systemctlExec({
      args: ['--version'],
    });
    expect(result).toEqual(RUN_RESULT_MOCK);

    expect(worker.callbacks.exec).toHaveBeenCalledWith('systemctl', {
      args: ['--version'],
    });
  });

  test('RunError should be properly catch', async () => {
    const worker = getPodmanWorkerImpl();

    vi.mocked(worker.callbacks.exec).mockRejectedValue(RUN_ERROR_MOCK);

    const result = await worker.systemctlExec({
      args: ['--version'],
    });
    expect(result).toEqual(RUN_ERROR_MOCK);
  });
});

describe('quadletExec', () => {
  test('RunResult should passthrough', async () => {
    const worker = getPodmanWorkerImpl();
    vi.mocked(QuadletBinaryResolver.prototype.resolve).mockResolvedValue(QUADLET_BINARY_PATH_MOCK);

    vi.mocked(worker.callbacks.exec).mockResolvedValue(RUN_RESULT_MOCK);

    const result = await worker.quadletExec({
      args: ['--version'],
    });
    expect(result).toEqual(RUN_RESULT_MOCK);

    expect(worker.callbacks.exec).toHaveBeenCalledWith('/usr/libexec/podman/quadlet', {
      args: ['--version'],
    });
  });

  test('RunError should be properly catch', async () => {
    const worker = getPodmanWorkerImpl();
    vi.mocked(QuadletBinaryResolver.prototype.resolve).mockResolvedValue(QUADLET_BINARY_PATH_MOCK);

    vi.mocked(worker.callbacks.exec).mockRejectedValue(RUN_ERROR_MOCK);

    const result = await worker.quadletExec({
      args: ['--version'],
    });
    expect(result).toEqual(RUN_ERROR_MOCK);
  });
});
