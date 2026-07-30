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
