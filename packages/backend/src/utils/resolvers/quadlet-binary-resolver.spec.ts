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

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { QuadletBinaryResolver, PODMAN_SYSTEMD_GENERATOR, BINARY_FALLBACK } from './quadlet-binary-resolver';
import { join } from 'node:path/posix';
import type { Logger, RunResult } from '@podman-desktop/api';
import type { PodmanWorker } from '../worker/podman-worker';

const QUADLET_BINARY_PATH_MOCK = '/usr/libexec/podman/quadlet';

const podmanWorkerMock: PodmanWorker = {
  exec: vi.fn(),
} as unknown as PodmanWorker;

const loggerMock: Logger = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

const RUN_RESULT_MOCK: RunResult = {
  stdout: '[]',
  stderr: '',
  command: 'dummy-command',
};

describe('QuadletBinaryResolver', () => {
  test('should return the quadlet binary path', async () => {
    const resolver = new QuadletBinaryResolver(podmanWorkerMock);
    vi.mocked(podmanWorkerMock.exec).mockImplementation(async command => {
      switch (command) {
        // if we try to get the systemd-path let's return it
        case 'systemd-path':
          return {
            stderr: '',
            stdout: '/usr/lib/systemd/system-generators',
            command: 'systemd-path',
          };
        case 'realpath':
          return {
            stderr: '',
            stdout: QUADLET_BINARY_PATH_MOCK,
            command: 'realpath',
          };
        // if we try to exec on the quadlet binary return dummy result
        case QUADLET_BINARY_PATH_MOCK:
          return RUN_RESULT_MOCK;
        default:
          throw new Error(`command ${command} not supported`);
      }
    });
    const path = await resolver.resolve();
    expect(path).toEqual(QUADLET_BINARY_PATH_MOCK);

    expect(podmanWorkerMock.exec).toHaveBeenCalledWith('systemd-path', {
      args: ['systemd-system-generator'],
      token: undefined,
    });
    expect(podmanWorkerMock.exec).toHaveBeenCalledWith('realpath', {
      args: [join('/usr/lib/systemd/system-generators', PODMAN_SYSTEMD_GENERATOR)],
      token: undefined,
    });
  });

  test('should fail if systemd generator directory is not absolute', async () => {
    const resolver = new QuadletBinaryResolver(podmanWorkerMock);

    vi.mocked(podmanWorkerMock.exec).mockResolvedValue({
      stderr: '',
      stdout: 'relative/path',
      command: 'systemd-path',
    } as RunResult);

    const result = await resolver.resolve({
      logger: loggerMock,
    });
    expect(result).toEqual(BINARY_FALLBACK);
    expect(loggerMock.error).toHaveBeenCalledWith(
      'something went wrong while getting the quadlet binary',
      new Error('systemd-system-generator directory is not absolute, received "relative/path".'),
    );
  });

  test('should cache on success', async () => {
    const resolver = new QuadletBinaryResolver(podmanWorkerMock);

    vi.mocked(podmanWorkerMock.exec).mockImplementation(async command => {
      switch (command) {
        // if we try to get the systemd-path let's return it
        case 'systemd-path':
          return {
            stderr: '',
            stdout: '/usr/lib/systemd/system-generators',
            command: 'systemd-path',
          };
        case 'realpath':
          return {
            stderr: '',
            stdout: QUADLET_BINARY_PATH_MOCK,
            command: 'realpath',
          };
        // if we try to exec on the quadlet binary return dummy result
        case QUADLET_BINARY_PATH_MOCK:
          return RUN_RESULT_MOCK;
        default:
          throw new Error(`command ${command} not supported`);
      }
    });
    for (let i = 0; i < 10; i++) {
      const path = await resolver.resolve();
      expect(path).toEqual(QUADLET_BINARY_PATH_MOCK);
    }

    // one for systemd-path
    // one for realpath
    expect(podmanWorkerMock.exec).toHaveBeenCalledTimes(2);
  });
});
