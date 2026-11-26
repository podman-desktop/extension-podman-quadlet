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

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PodmanNativeWorker } from '/@/utils/worker/podman-native-worker';
import { homedir } from 'node:os';
import { readFile, rm, mkdir, writeFile, realpath } from 'node:fs/promises';
import { dirname } from 'node:path/posix';
import type { process as ProcessApi, ProviderContainerConnection } from '@podman-desktop/api';
import type { PodmanWorker } from '/@/utils/worker/podman-worker';
import { isFileNotFoundError } from '@podman-desktop/quadlet-extension-core-api';

// mock node packages
vi.mock(import('node:fs/promises'));
vi.mock(import('node:os'));

const WSL_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    vmType: 'WSL',
    name: 'podman-machine-default',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const NATIVE_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    vmType: undefined,
    name: 'podman',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const PROCESS_API_MOCK: typeof ProcessApi = {
  exec: vi.fn(),
} as unknown as typeof ProcessApi;

const HOMEDIR_MOCK: string = '/home';

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(homedir).mockReturnValue(HOMEDIR_MOCK);
});

describe('init', () => {
  test('should initialize successfully when vmType is undefined', async () => {
    const worker = new PodmanNativeWorker(NATIVE_PROVIDER_CONNECTION_MOCK, PROCESS_API_MOCK);
    await expect(worker.init()).resolves.toBeUndefined();
  });

  test('should throw error when vmType is defined', async () => {
    const worker = new PodmanNativeWorker(WSL_PROVIDER_CONNECTION_MOCK, PROCESS_API_MOCK);
    await expect(worker.init()).rejects.toThrow('PodmanNativeWorker cannot deal with podman machines');
  });
});

describe('read', () => {
  test('should read file content', async () => {
    const worker = new PodmanNativeWorker(NATIVE_PROVIDER_CONNECTION_MOCK, PROCESS_API_MOCK);

    const expectedContent = 'file content';
    vi.mocked(readFile).mockResolvedValue(expectedContent);

    const content = await worker.read('test-path');

    expect(content).toBe(expectedContent);
    expect(readFile).toHaveBeenCalledWith('test-path', { encoding: 'utf8' });
  });

  test('homedir path should be resolved', async () => {
    const worker = new PodmanNativeWorker(NATIVE_PROVIDER_CONNECTION_MOCK, PROCESS_API_MOCK);
    vi.mocked(readFile).mockResolvedValue('');

    await worker.read('~/foo/bar.env');

    expect(readFile).toHaveBeenCalledWith(`${HOMEDIR_MOCK}/foo/bar.env`, { encoding: 'utf8' });
  });

  test('embedded tilde should not be resolved', async () => {
    const worker = new PodmanNativeWorker(NATIVE_PROVIDER_CONNECTION_MOCK, PROCESS_API_MOCK);
    vi.mocked(readFile).mockResolvedValue('');

    await worker.read('/foo/app~backup.env');

    expect(readFile).toHaveBeenCalledWith('/foo/app~backup.env', { encoding: 'utf8' });
  });

  test('ENOENT error should be converted to file not found error', async () => {
    const worker = new PodmanNativeWorker(NATIVE_PROVIDER_CONNECTION_MOCK, PROCESS_API_MOCK);
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' }),
    );

    const error = await worker.read('/foo/bar.env').catch((err: unknown) => err);
    expect(isFileNotFoundError(error)).toBeTruthy();
  });

  test('other errors should be propagated', async () => {
    const worker = new PodmanNativeWorker(NATIVE_PROVIDER_CONNECTION_MOCK, PROCESS_API_MOCK);
    vi.mocked(readFile).mockRejectedValue(Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }));

    await expect(worker.read('/foo/bar.env')).rejects.toThrow('EACCES: permission denied');
  });
});

describe('write', () => {
  let worker: PodmanWorker;
  beforeEach(() => {
    worker = new PodmanNativeWorker(NATIVE_PROVIDER_CONNECTION_MOCK, PROCESS_API_MOCK);
  });

  test('path with tilde should be resolved', async () => {
    await worker.write('~/hello/world.txt', 'foo');

    const resolved = `${HOMEDIR_MOCK}/hello/world.txt`;
    expect(mkdir).toHaveBeenCalledWith(dirname(resolved), { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(resolved, 'foo', { encoding: 'utf8' });
  });

  test('absolute path should be used as it is', async () => {
    await worker.write('/hello/world.txt', 'foo');

    expect(mkdir).toHaveBeenCalledWith('/hello', { recursive: true });
    expect(writeFile).toHaveBeenCalledWith('/hello/world.txt', 'foo', { encoding: 'utf8' });
  });
});

describe('rm', () => {
  test('should remove file', async () => {
    const worker = new PodmanNativeWorker(NATIVE_PROVIDER_CONNECTION_MOCK, PROCESS_API_MOCK);

    const testPath = 'test-path';

    await worker.rm(testPath);

    expect(rm).toHaveBeenCalledWith(testPath, { recursive: false, force: false });
  });
});

describe('exec', () => {
  let worker: PodmanWorker;
  beforeEach(() => {
    worker = new PodmanNativeWorker(NATIVE_PROVIDER_CONNECTION_MOCK, PROCESS_API_MOCK);
  });

  test('should execute command with options', async () => {
    await worker.exec('echo', {
      args: ['hello world'],
    });

    expect(PROCESS_API_MOCK.exec).toHaveBeenCalledWith('echo', ['hello world'], {});
  });
});

describe('realpath', () => {
  let worker: PodmanWorker;
  beforeEach(() => {
    worker = new PodmanNativeWorker(NATIVE_PROVIDER_CONNECTION_MOCK, PROCESS_API_MOCK);
  });

  test('should use realpath', async () => {
    vi.mocked(realpath).mockResolvedValue('/foo.txt');

    const result = await worker.realPath('/foo-symlink.txt');
    expect(result).toEqual('/foo.txt');

    expect(realpath).toHaveBeenCalledExactlyOnceWith('/foo-symlink.txt');
  });
});
