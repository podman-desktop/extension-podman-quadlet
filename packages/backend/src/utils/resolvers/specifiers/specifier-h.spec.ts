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

import { expect, test, vi, beforeEach } from 'vitest';
import { SpecifierH } from '/@/utils/resolvers/specifiers/specifier-h';
import type { PodmanWorker } from '/@/utils/worker/podman-worker';
import type { CancellationToken, Logger } from '@podman-desktop/api';

const PODMAN_WORKER_MOCK: PodmanWorker = {
  exec: vi.fn(),
} as unknown as PodmanWorker;

beforeEach(() => {
  vi.resetAllMocks();
});

test('key should be %h', () => {
  const specifier = new SpecifierH(PODMAN_WORKER_MOCK);
  expect(specifier.key).toBe('%h');
});

test('should return the home directory', async () => {
  const specifier = new SpecifierH(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.exec).mockResolvedValue({
    stdout: '/home/user',
    stderr: '',
    command: 'echo "$HOME"',
  });

  const result = await specifier.resolve();
  expect(result).toBe('/home/user');
  expect(PODMAN_WORKER_MOCK.exec).toHaveBeenCalledWith('echo', {
    args: ['"$HOME"'],
    token: undefined,
    logger: undefined,
  });
});

test('should throw error if the resolved path is not absolute', async () => {
  const specifier = new SpecifierH(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.exec).mockResolvedValue({
    stdout: 'relative/path',
    stderr: '',
    command: 'echo "$HOME"',
  });

  await expect(specifier.resolve()).rejects.toThrow(
    'cannot determine home directory: relative/path is not an absolute path',
  );
});

test('should pass token and logger to worker', async () => {
  const specifier = new SpecifierH(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.exec).mockResolvedValue({
    stdout: '/home/user',
    stderr: '',
    command: 'echo "$HOME"',
  });

  const token = {} as CancellationToken;
  const logger = {} as Logger;

  await specifier.resolve({ token, logger });

  expect(PODMAN_WORKER_MOCK.exec).toHaveBeenCalledExactlyOnceWith('echo', {
    args: ['"$HOME"'],
    token,
    logger,
  });
});
