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

import { PodmanSSHWorker } from './podman-ssh-worker';
import type { ProviderContainerConnection } from '@podman-desktop/api';
import { PodmanSFTP } from '../remote/podman-sftp';
import { PodmanSSH } from '../remote/podman-ssh';
import type { PodmanWorker } from './podman-worker';
import type { ConnectConfig } from 'ssh2';

vi.mock(import('../remote/podman-sftp'));
vi.mock(import('../remote/podman-ssh'));

const WSL_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    vmType: 'WSL',
    name: 'podman-machine-default',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const PODMAN_SFTP_MOCK: PodmanSFTP = {
  read: vi.fn(),
  rm: vi.fn(),
  connect: vi.fn(),
  write: vi.fn(),
  dispose: vi.fn(),
} as unknown as PodmanSFTP;

const PODMAN_SSH_MOCK: PodmanSSH = {
  connect: vi.fn(),
  exec: vi.fn(),
  dispose: vi.fn(),
} as unknown as PodmanSSH;

const CONNECT_CONFIG_MOCK: ConnectConfig = {} as unknown as ConnectConfig;

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(PodmanSFTP).mockReturnValue(PODMAN_SFTP_MOCK);
  vi.mocked(PodmanSSH).mockReturnValue(PODMAN_SSH_MOCK);
});

function getPodmanSSHWorker(): PodmanWorker {
  return new PodmanSSHWorker(WSL_PROVIDER_CONNECTION_MOCK, CONNECT_CONFIG_MOCK);
}

describe('init', () => {
  test('should connect SFTP and SSH client', async () => {
    const worker = getPodmanSSHWorker();

    await worker.init();

    expect(PODMAN_SFTP_MOCK.connect).toHaveBeenCalledOnce();
    expect(PODMAN_SSH_MOCK.connect).toHaveBeenCalledOnce();
  });
});

describe('read', () => {
  const DUMMY_CONTENT = 'bar';

  beforeEach(() => {
    vi.mocked(PODMAN_SFTP_MOCK.read).mockResolvedValue(DUMMY_CONTENT);
  });

  test('read should proxy to PodmanSFTP#read', async () => {
    const worker = getPodmanSSHWorker();

    const result = await worker.read('/foo.txt');
    expect(result).toEqual(DUMMY_CONTENT);

    expect(PODMAN_SFTP_MOCK.read).toHaveBeenCalledOnce();
    expect(PODMAN_SFTP_MOCK.read).toHaveBeenCalledWith('/foo.txt');
  });
});

describe('rm', () => {
  test('rm should proxy to PodmanSFTP#rm', async () => {
    const worker = getPodmanSSHWorker();

    await worker.rm('/foo.txt');

    expect(PODMAN_SFTP_MOCK.rm).toHaveBeenCalledOnce();
    expect(PODMAN_SFTP_MOCK.rm).toHaveBeenCalledWith('/foo.txt');
  });
});

describe('rm', () => {
  test('rm should proxy to PodmanSFTP#rm', async () => {
    const worker = getPodmanSSHWorker();

    await worker.rm('/foo.txt');

    expect(PODMAN_SFTP_MOCK.rm).toHaveBeenCalledOnce();
    expect(PODMAN_SFTP_MOCK.rm).toHaveBeenCalledWith('/foo.txt');
  });
});

describe('write', () => {
  test('write should proxy to PodmanSFTP#write', async () => {
    const worker = getPodmanSSHWorker();

    await worker.write('/foo.txt', 'bar');

    expect(PODMAN_SFTP_MOCK.write).toHaveBeenCalledOnce();
    expect(PODMAN_SFTP_MOCK.write).toHaveBeenCalledWith('/foo.txt', 'bar');
  });
});

describe('exec', () => {
  test('exec without options should proxy to PodmanSSH#exec', async () => {
    const worker = getPodmanSSHWorker();

    await worker.exec('echo');

    expect(PODMAN_SSH_MOCK.exec).toHaveBeenCalledOnce();
    expect(PODMAN_SSH_MOCK.exec).toHaveBeenCalledWith('echo', undefined);
  });

  test('exec without option should proxy to PodmanSSH#exec', async () => {
    const worker = getPodmanSSHWorker();

    await worker.exec('echo', { args: ['hello'] });

    expect(PODMAN_SSH_MOCK.exec).toHaveBeenCalledOnce();
    expect(PODMAN_SSH_MOCK.exec).toHaveBeenCalledWith('echo', { args: ['hello'] });
  });
});

describe('dispose', () => {
  test('disposing the worker should dispose the two clients', async () => {
    const worker = getPodmanSSHWorker();

    worker.dispose();

    expect(PODMAN_SFTP_MOCK.dispose).toHaveBeenCalledOnce();
    expect(PODMAN_SSH_MOCK.dispose).toHaveBeenCalledOnce();
  });
});
