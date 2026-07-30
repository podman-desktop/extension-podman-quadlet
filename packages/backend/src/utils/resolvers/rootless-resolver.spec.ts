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
import { RootlessResolver, ROOTLESS_FALLBACK } from '/@/utils/resolvers/rootless-resolver';
import type { PodmanWorker } from '/@/utils/worker/podman-worker';
import type { CancellationToken } from '@podman-desktop/api';

const PODMAN_WORKER_MOCK: PodmanWorker = {
  podmanExec: vi.fn(),
} as unknown as PodmanWorker;

beforeEach(() => {
  vi.resetAllMocks();
});

test('should return false for a rootful connection', async () => {
  const resolver = new RootlessResolver(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.podmanExec).mockResolvedValue({
    stdout: 'false\n',
    stderr: '',
    command: 'podman info --format {{.Host.Security.Rootless}}',
  });

  await expect(resolver.resolve()).resolves.toBe(false);

  expect(PODMAN_WORKER_MOCK.podmanExec).toHaveBeenCalledWith({
    args: ['info', '--format', '{{.Host.Security.Rootless}}'],
  });
});

test('should return true for a rootless connection', async () => {
  const resolver = new RootlessResolver(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.podmanExec).mockResolvedValue({
    stdout: 'true\n',
    stderr: '',
    command: 'podman info --format {{.Host.Security.Rootless}}',
  });

  await expect(resolver.resolve()).resolves.toBe(true);
});

test('should cache the result on success', async () => {
  const resolver = new RootlessResolver(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.podmanExec).mockResolvedValue({
    stdout: 'false\n',
    stderr: '',
    command: 'podman info --format {{.Host.Security.Rootless}}',
  });

  for (let i = 0; i < 10; i++) {
    await expect(resolver.resolve()).resolves.toBe(false);
  }

  expect(PODMAN_WORKER_MOCK.podmanExec).toHaveBeenCalledOnce();
});

test('error in podmanExec should fallback to ROOTLESS_FALLBACK', async () => {
  const resolver = new RootlessResolver(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.podmanExec).mockRejectedValue(new Error('Something went wrong'));

  await expect(resolver.resolve()).resolves.toBe(ROOTLESS_FALLBACK);
});

test('malformed stdout should fallback to ROOTLESS_FALLBACK rather than resolving to rootful', async () => {
  const resolver = new RootlessResolver(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.podmanExec).mockResolvedValue({
    stdout: '',
    stderr: 'some unexpected error output',
    command: 'podman info --format {{.Host.Security.Rootless}}',
  });

  await expect(resolver.resolve()).resolves.toBe(ROOTLESS_FALLBACK);
});

test('should cache the fallback after a non-cancellation failure', async () => {
  const resolver = new RootlessResolver(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.podmanExec).mockRejectedValue(new Error('Something went wrong'));

  for (let i = 0; i < 10; i++) {
    await expect(resolver.resolve()).resolves.toBe(ROOTLESS_FALLBACK);
  }

  // cached after the first failure: podmanExec should not be retried on subsequent calls
  expect(PODMAN_WORKER_MOCK.podmanExec).toHaveBeenCalledOnce();
});

test('should not cache the fallback when cancelled, and retry on the next call', async () => {
  const resolver = new RootlessResolver(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.podmanExec).mockRejectedValue(new Error('Something went wrong'));

  const cancelledToken: CancellationToken = {
    isCancellationRequested: true,
    onCancellationRequested: vi.fn(),
  };

  await expect(resolver.resolve({ token: cancelledToken })).resolves.toBe(ROOTLESS_FALLBACK);
  await expect(resolver.resolve({ token: cancelledToken })).resolves.toBe(ROOTLESS_FALLBACK);

  expect(PODMAN_WORKER_MOCK.podmanExec).toHaveBeenCalledTimes(2);
});
