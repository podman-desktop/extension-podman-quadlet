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
import { PodmanVersionResolver, VERSION_FALLBACK } from './podman-version-resolver';
import type { PodmanWorker } from '../worker/podman-worker';
import { SemVer } from 'semver';

const PODMAN_WORKER_MOCK: PodmanWorker = {
  podmanExec: vi.fn(),
} as unknown as PodmanWorker;

beforeEach(() => {
  vi.resetAllMocks();
});

test('should return the podman version', async () => {
  const resolver = new PodmanVersionResolver(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.podmanExec).mockResolvedValue({
    stdout: 'podman version 5.7.1',
    stderr: '',
    command: 'podman --version',
  });

  const version = await resolver.resolve();
  expect(version).toBeInstanceOf(SemVer);
  expect(version.major).toBe(5);
  expect(version.minor).toBe(7);
  expect(version.patch).toBe(1);
  expect(version.version).toBe('5.7.1');

  expect(PODMAN_WORKER_MOCK.podmanExec).toHaveBeenCalledWith({
    args: ['--version'],
  });
});

test('should cache the version on success', async () => {
  const resolver = new PodmanVersionResolver(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.podmanExec).mockResolvedValue({
    stdout: 'podman version 5.7.1',
    stderr: '',
    command: 'podman --version',
  });

  for (let i = 0; i < 10; i++) {
    const version = await resolver.resolve();
    expect(version.version).toBe('5.7.1');
  }

  expect(PODMAN_WORKER_MOCK.podmanExec).toHaveBeenCalledOnce();
});

test('error in podmanExec should fallback to VERSION_FALLBACK', async () => {
  const resolver = new PodmanVersionResolver(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.podmanExec).mockRejectedValue(new Error('Something went wrong'));

  const version = await resolver.resolve();
  expect(version.version).toBe(VERSION_FALLBACK.version);
});
