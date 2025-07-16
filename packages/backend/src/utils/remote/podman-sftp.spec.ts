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
import { vi, test, expect, beforeEach, afterEach, describe, assert } from 'vitest';
import type { ConnectConfig } from 'ssh2';
import SftpClient from 'ssh2-sftp-client';
import { PodmanSFTP } from './podman-sftp';

vi.mock(import('ssh2'));
vi.mock(import('ssh2-sftp-client'));

const SSH_CONFIG_MOCK: ConnectConfig = {
  host: 'localhost',
  port: 2222,
  username: 'potatoes',
  privateKey: '==content==',
};

const SFTP_CLIENT_MOCK: SftpClient = {
  connect: vi.fn(),
  on: vi.fn(),
  end: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  mkdir: vi.fn(),
  put: vi.fn(),
} as unknown as SftpClient;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();

  vi.mocked(SFTP_CLIENT_MOCK.end).mockResolvedValue(false);

  vi.mocked(SftpClient).mockReturnValue(SFTP_CLIENT_MOCK);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('connect', () => {
  let podmanSFTP: PodmanSFTP;

  beforeEach(() => {
    podmanSFTP = new PodmanSFTP(SSH_CONFIG_MOCK);
  });

  test('connection successful', async () => {
    await podmanSFTP.connect();

    expect(SFTP_CLIENT_MOCK.connect).toHaveBeenCalledOnce();
    expect(SFTP_CLIENT_MOCK.connect).toHaveBeenCalledWith(SSH_CONFIG_MOCK);

    expect(podmanSFTP.connected).toBeTruthy();
  });

  test('connection closing should handle reconnection', async () => {
    await podmanSFTP.connect();

    // ensure is connected
    expect(podmanSFTP.connected).toBeTruthy();

    const endListener = vi.mocked(SFTP_CLIENT_MOCK.on).mock.calls.find(([event]) => event === 'end')?.[1];
    assert(endListener, 'client should register end listener');

    endListener();

    // ensure is connected
    expect(podmanSFTP.connected).toBeFalsy();

    await vi.advanceTimersByTimeAsync(50_000);

    expect(SFTP_CLIENT_MOCK.connect).toHaveBeenCalledTimes(2);
    // ensure is connected
    expect(podmanSFTP.connected).toBeTruthy();
  });
});

describe('read', () => {
  let podmanSFTP: PodmanSFTP;

  beforeEach(async () => {
    podmanSFTP = new PodmanSFTP(SSH_CONFIG_MOCK);
    await podmanSFTP.connect();
  });

  test('get buffer response should be converted to utf-8 string', async () => {
    // mock buffer for resolve content
    vi.mocked(SFTP_CLIENT_MOCK.get).mockResolvedValue(Buffer.from('bar'));

    const response: string = await podmanSFTP.read('/foo');
    expect(response).toBe('bar');
  });

  test('get string should be returned as it is', async () => {
    // mock string for resolve content
    vi.mocked(SFTP_CLIENT_MOCK.get).mockResolvedValue('bar');

    const response: string = await podmanSFTP.read('/foo');
    expect(response).toBe('bar');
  });

  test('homedir path should be resolved', async () => {
    // mock string for resolve content
    vi.mocked(SFTP_CLIENT_MOCK.get).mockResolvedValue('bar');

    await podmanSFTP.read('~/foo');

    expect(SFTP_CLIENT_MOCK.get).toHaveBeenCalledWith(`/home/${SSH_CONFIG_MOCK.username}/foo`);
  });
});

describe('write', () => {
  let podmanSFTP: PodmanSFTP;

  beforeEach(async () => {
    podmanSFTP = new PodmanSFTP(SSH_CONFIG_MOCK);
    await podmanSFTP.connect();
  });

  test('should mkdir parent', async () => {
    await podmanSFTP.write('/foo/bar.txt', 'hello');

    expect(SFTP_CLIENT_MOCK.mkdir).toHaveBeenCalledWith('/foo', true);
    expect(SFTP_CLIENT_MOCK.put).toHaveBeenCalledWith(expect.any(Buffer), '/foo/bar.txt');
  });

  test('content should be converted to buffer', async () => {
    await podmanSFTP.write('/foo/bar.txt', 'hello');

    expect(SFTP_CLIENT_MOCK.put).toHaveBeenCalledWith(expect.any(Buffer), '/foo/bar.txt');
    const buffer = vi.mocked(SFTP_CLIENT_MOCK.put).mock.calls[0][0];
    assert(Buffer.isBuffer(buffer), 'first argument should be a buffer');

    expect(buffer.toString('utf-8')).toStrictEqual('hello');
  });

  test('homedir path should be resolved', async () => {
    await podmanSFTP.write('~/foo/bar.txt', 'hello');

    expect(SFTP_CLIENT_MOCK.mkdir).toHaveBeenCalledWith(`/home/${SSH_CONFIG_MOCK.username}/foo`, true);
    expect(SFTP_CLIENT_MOCK.put).toHaveBeenCalledWith(
      expect.any(Buffer),
      `/home/${SSH_CONFIG_MOCK.username}/foo/bar.txt`,
    );
  });
});

describe('rm', () => {
  let podmanSFTP: PodmanSFTP;

  beforeEach(async () => {
    podmanSFTP = new PodmanSFTP(SSH_CONFIG_MOCK);
    await podmanSFTP.connect();
  });

  test('absolute path should be kept as it is', async () => {
    await podmanSFTP.rm('/foo/bar.txt');

    expect(SFTP_CLIENT_MOCK.delete).toHaveBeenCalledWith(`/foo/bar.txt`);
  });

  test('homedir path should be resolved', async () => {
    await podmanSFTP.rm('~/foo/bar.txt');

    expect(SFTP_CLIENT_MOCK.delete).toHaveBeenCalledWith(`/home/${SSH_CONFIG_MOCK.username}/foo/bar.txt`);
  });
});

test('dispose should end ssh2 client', () => {
  const podmanSFTP = new PodmanSFTP(SSH_CONFIG_MOCK);
  podmanSFTP.dispose();

  expect(SFTP_CLIENT_MOCK.end).toHaveBeenCalledOnce();
});
