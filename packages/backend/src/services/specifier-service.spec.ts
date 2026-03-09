/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
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

import { expect, test, vi, beforeEach, describe } from 'vitest';
import { SpecifierService } from './specifier-service';
import type { PodmanService } from './podman-service';
import type { ProviderContainerConnection, RunResult } from '@podman-desktop/api';
import type { PodmanWorker } from '../utils/worker/podman-worker';

const PODMAN_WORKER_MOCK: PodmanWorker = {
  exec: vi.fn(),
} as unknown as PodmanWorker;

const PODMAN_SERVICE_MOCK: PodmanService = {
  getWorker: vi.fn(),
} as unknown as PodmanService;

const CONNECTION_MOCK: ProviderContainerConnection = {
  providerId: 'provider-id',
  connection: {
    name: 'connection-name',
  },
} as unknown as ProviderContainerConnection;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('SpecifierService', () => {
  test('expand: path does not start with % should return as is', async () => {
    const service = new SpecifierService({ podman: PODMAN_SERVICE_MOCK });
    const path = '/some/path';
    const result = await service.expand(CONNECTION_MOCK, path);
    expect(result).toBe(path);
  });

  test('expand: specifier with length !== 2 should return as is', async () => {
    const service = new SpecifierService({ podman: PODMAN_SERVICE_MOCK });
    const path = '%abc/foo';
    const result = await service.expand(CONNECTION_MOCK, path);
    expect(result).toBe(path);
  });

  test('expand: unsupported specifier should throw error', async () => {
    const service = new SpecifierService({ podman: PODMAN_SERVICE_MOCK });
    const path = '%x/foo';
    await expect(service.expand(CONNECTION_MOCK, path)).rejects.toThrowError('specifier %x is not yet supported');
  });

  test('expand: %h should resolve and cache', async () => {
    const service = new SpecifierService({ podman: PODMAN_SERVICE_MOCK });
    vi.mocked(PODMAN_SERVICE_MOCK.getWorker).mockResolvedValue(PODMAN_WORKER_MOCK);
    vi.mocked(PODMAN_WORKER_MOCK.exec).mockResolvedValue({
      stdout: '/home/user',
      stderr: '',
      command: 'echo "$HOME"',
    } as RunResult);

    // First call
    const result1 = await service.expand(CONNECTION_MOCK, '%h/foo');
    expect(result1).toBe('/home/user/foo');
    expect(PODMAN_SERVICE_MOCK.getWorker).toHaveBeenCalledWith(CONNECTION_MOCK);
    expect(PODMAN_WORKER_MOCK.exec).toHaveBeenCalledWith('echo', expect.objectContaining({ args: ['"$HOME"'] }));

    // Second call (should be cached)
    vi.mocked(PODMAN_SERVICE_MOCK.getWorker).mockClear();
    vi.mocked(PODMAN_WORKER_MOCK.exec).mockClear();

    const result2 = await service.expand(CONNECTION_MOCK, '%h/bar');
    expect(result2).toBe('/home/user/bar');
    expect(PODMAN_SERVICE_MOCK.getWorker).not.toHaveBeenCalled();
    expect(PODMAN_WORKER_MOCK.exec).not.toHaveBeenCalled();
  });

  test('expand: different connections should have different cache', async () => {
    const service = new SpecifierService({ podman: PODMAN_SERVICE_MOCK });
    vi.mocked(PODMAN_SERVICE_MOCK.getWorker).mockResolvedValue(PODMAN_WORKER_MOCK);
    vi.mocked(PODMAN_WORKER_MOCK.exec)
      .mockResolvedValueOnce({
        stdout: '/home/user1',
        stderr: '',
        command: 'echo "$HOME"',
      } as RunResult)
      .mockResolvedValueOnce({
        stdout: '/home/user2',
        stderr: '',
        command: 'echo "$HOME"',
      } as RunResult);

    const connection2: ProviderContainerConnection = {
      providerId: 'provider-id-2',
      connection: {
        name: 'connection-name-2',
      },
    } as unknown as ProviderContainerConnection;

    const result1 = await service.expand(CONNECTION_MOCK, '%h');
    expect(result1).toBe('/home/user1');

    const result2 = await service.expand(connection2, '%h');
    expect(result2).toBe('/home/user2');

    expect(PODMAN_SERVICE_MOCK.getWorker).toHaveBeenCalledTimes(2);
  });

  test('dispose should clear cache', async () => {
    const service = new SpecifierService({ podman: PODMAN_SERVICE_MOCK });
    vi.mocked(PODMAN_SERVICE_MOCK.getWorker).mockResolvedValue(PODMAN_WORKER_MOCK);
    vi.mocked(PODMAN_WORKER_MOCK.exec).mockResolvedValue({
      stdout: '/home/user',
      stderr: '',
      command: 'echo "$HOME"',
    } as RunResult);

    await service.expand(CONNECTION_MOCK, '%h');
    expect(PODMAN_SERVICE_MOCK.getWorker).toHaveBeenCalledTimes(1);

    service.dispose();

    vi.mocked(PODMAN_SERVICE_MOCK.getWorker).mockClear();
    vi.mocked(PODMAN_WORKER_MOCK.exec).mockClear();

    await service.expand(CONNECTION_MOCK, '%h');
    expect(PODMAN_SERVICE_MOCK.getWorker).toHaveBeenCalledTimes(1);
  });
});
