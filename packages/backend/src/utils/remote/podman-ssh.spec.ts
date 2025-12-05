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
import { vi, test, expect, beforeEach, afterEach, assert, describe } from 'vitest';
import { PodmanSSH } from './podman-ssh';
import type { ClientCallback, ClientChannel, ConnectConfig } from 'ssh2';
import { Client } from 'ssh2';
import type { CancellationToken, Logger, RunResult } from '@podman-desktop/api';

vi.mock(import('ssh2'));

const SSH_CONFIG_MOCK: ConnectConfig = {
  host: 'localhost',
  port: 2222,
  username: 'potatoes',
  privateKey: '==content==',
};

const CLIENT_CHANNEL_MOCK: ClientChannel = {
  stdout: {
    on: vi.fn(),
  },
  stderr: {
    on: vi.fn(),
  },
  on: vi.fn(),
  close: vi.fn(),
  closed: false,
} as unknown as ClientChannel;

const CANCELLATION_TOKEN_MOCK: CancellationToken = {
  onCancellationRequested: vi.fn(),
} as unknown as CancellationToken;

const LOGGER_MOCK: Logger = {
  log: vi.fn(),
  error: vi.fn(),
} as unknown as Logger;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();

  vi.mocked(Client.prototype.on).mockReturnThis();
});

afterEach(() => {
  vi.useRealTimers();
});

function getEventListener(event: string): () => void {
  // ensure we registered a listener for ready event
  expect(Client.prototype.on).toHaveBeenCalledWith(event, expect.any(Function));

  // extract the listener
  const listener = vi
    .mocked(Client.prototype.on)
    .mock.calls.find(([channel]) => (channel as string) === event)?.[1] as () => void;
  assert(listener, 'listener should be defined');

  return listener;
}

describe('connect', () => {
  let podmanSSH: PodmanSSH;

  beforeEach(() => {
    podmanSSH = new PodmanSSH(SSH_CONFIG_MOCK);
  });

  test('ready event should resolve connect promise', async () => {
    const connectPromise: Promise<boolean> = podmanSSH.connect();

    const listener = getEventListener('ready');

    // call the ready listener
    listener();

    const result = await connectPromise;
    expect(result).toBeTruthy();

    // ensure worker is connected
    expect(podmanSSH.connected).toBeTruthy();
  });

  test('error event should reject connect promise', async () => {
    const connectPromise: Promise<boolean> = podmanSSH.connect();

    const listener = getEventListener('error');

    // call the ready listener
    listener();

    await expect(async () => {
      await connectPromise;
    }).rejects.toBeFalsy();

    // ensure worker is not connected
    expect(podmanSSH.connected).toBeFalsy();
  });

  test('client receiving end event should start reconnection', async () => {
    const connectPromise: Promise<boolean> = podmanSSH.connect();

    // call the ready listener
    getEventListener('ready')();

    const result = await connectPromise;
    expect(result).toBeTruthy();

    // ensure worker is connected
    expect(podmanSSH.connected).toBeTruthy();

    // we should have connected only once
    expect(Client.prototype.connect).toHaveBeenCalledOnce();

    // call the ready listener
    getEventListener('end')();

    // worker should be marked as not connected
    expect(podmanSSH.connected).toBeFalsy();

    // move in the future
    await vi.advanceTimersByTimeAsync(50_000);

    // we should have connected again
    expect(Client.prototype.connect).toHaveBeenCalledTimes(2);
  });
});

describe('exec', () => {
  let podmanSSH: PodmanSSH;

  beforeEach(() => {
    podmanSSH = new PodmanSSH(SSH_CONFIG_MOCK);
  });

  function getClientCallback(): Promise<ClientCallback> {
    return vi.waitFor<ClientCallback>(() => {
      expect(Client.prototype.exec).toHaveBeenCalledOnce();

      const args: Array<unknown> = vi.mocked(Client.prototype.exec).mock.calls[0];
      expect(args).toHaveLength(3);
      return args[2] as ClientCallback;
    });
  }

  function getStderrListener(): (chunk: string) => void {
    expect(CLIENT_CHANNEL_MOCK.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
    const listener = vi.mocked(CLIENT_CHANNEL_MOCK.stderr.on).mock.calls.find(([event]) => event === 'data')?.[1];
    assert(listener, 'data listener should be defined');
    return listener as (chunk: string) => void;
  }

  function getStdoutListener(): (chunk: string) => void {
    expect(CLIENT_CHANNEL_MOCK.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
    const listener = vi.mocked(CLIENT_CHANNEL_MOCK.stdout.on).mock.calls.find(([event]) => event === 'data')?.[1];
    assert(listener, 'data listener should be defined');
    return listener as (chunk: string) => void;
  }

  function getExitListener(): (code: number) => void {
    expect(CLIENT_CHANNEL_MOCK.on).toHaveBeenCalledWith('exit', expect.any(Function));
    const listener = vi.mocked(CLIENT_CHANNEL_MOCK.on).mock.calls.find(([event]) => event === 'exit')?.[1];
    assert(listener, 'exit listener should be defined');
    return listener as (code: number) => void;
  }

  test('error in ClientCallback should reject the execPromise', async () => {
    const execPromise: Promise<RunResult> = podmanSSH.exec('echo', { args: ['"hello"'] });

    const listener: ClientCallback = await getClientCallback();

    listener(new Error('dummy'), CLIENT_CHANNEL_MOCK);

    await expect(async () => {
      await execPromise;
    }).rejects.toThrowError('dummy');
  });

  test('exit with 0 should resolve', async () => {
    const execPromise: Promise<RunResult> = podmanSSH.exec('echo', { args: [], token: CANCELLATION_TOKEN_MOCK });

    const listener: ClientCallback = await getClientCallback();

    listener(undefined, CLIENT_CHANNEL_MOCK);

    const exitListener = getExitListener();

    exitListener(0);

    await execPromise;
  });

  test('exit with non-zero should reject', async () => {
    const execPromise: Promise<RunResult> = podmanSSH.exec('echo', { args: [], token: CANCELLATION_TOKEN_MOCK });

    const listener: ClientCallback = await getClientCallback();

    listener(undefined, CLIENT_CHANNEL_MOCK);

    const exitListener = getExitListener();

    exitListener(1);

    await expect(async () => {
      await execPromise;
    }).rejects.toStrictEqual(
      expect.objectContaining({
        exitCode: 1,
      }),
    );
  });

  test('cancellation token should receive a listener', async () => {
    const execPromise: Promise<RunResult> = podmanSSH.exec('echo', { args: [], token: CANCELLATION_TOKEN_MOCK });

    const listener: ClientCallback = await getClientCallback();

    listener(undefined, CLIENT_CHANNEL_MOCK);

    expect(CANCELLATION_TOKEN_MOCK.onCancellationRequested).toHaveBeenCalledOnce();
    expect(CANCELLATION_TOKEN_MOCK.onCancellationRequested).toHaveBeenCalledWith(expect.any(Function));

    const exitListener = getExitListener();
    exitListener(0);

    await execPromise;
  });

  test('cancelling a token should close the channel', async () => {
    const execPromise: Promise<RunResult> = podmanSSH.exec('echo', { args: [], token: CANCELLATION_TOKEN_MOCK });

    const listener: ClientCallback = await getClientCallback();

    listener(undefined, CLIENT_CHANNEL_MOCK);

    const cancelListener = await vi.waitFor(() => {
      expect(CANCELLATION_TOKEN_MOCK.onCancellationRequested).toHaveBeenCalledOnce();
      expect(CANCELLATION_TOKEN_MOCK.onCancellationRequested).toHaveBeenCalledWith(expect.any(Function));
      return vi.mocked(CANCELLATION_TOKEN_MOCK.onCancellationRequested).mock.calls[0][0];
    });

    // simulate cancellation
    cancelListener(undefined);

    expect(CLIENT_CHANNEL_MOCK.close).toHaveBeenCalledOnce();

    const exitListener = getExitListener();
    exitListener(0);

    await execPromise;
  });

  test('std should be aggregated in RunResult', async () => {
    const execPromise: Promise<RunResult> = podmanSSH.exec('echo', { args: [], token: CANCELLATION_TOKEN_MOCK });

    const listener: ClientCallback = await getClientCallback();

    listener(undefined, CLIENT_CHANNEL_MOCK);

    const stdoutListener = getStdoutListener();
    const stderrListener = getStderrListener();

    stdoutListener('foo');
    stderrListener('bar');

    const exitListener = getExitListener();
    exitListener(0);

    const result = await execPromise;
    expect(result.stdout).toStrictEqual('foo');
    expect(result.stderr).toStrictEqual('bar');
  });

  test('std should be provided to the logger', async () => {
    const execPromise: Promise<RunResult> = podmanSSH.exec('echo', {
      args: [],
      token: CANCELLATION_TOKEN_MOCK,
      logger: LOGGER_MOCK,
    });

    const listener: ClientCallback = await getClientCallback();

    listener(undefined, CLIENT_CHANNEL_MOCK);

    const stdoutListener = getStdoutListener();
    const stderrListener = getStderrListener();

    stdoutListener('foo');
    stderrListener('bar');

    const exitListener = getExitListener();
    exitListener(0);

    expect(LOGGER_MOCK.log).toHaveBeenCalledWith('foo');
    expect(LOGGER_MOCK.error).toHaveBeenCalledWith('bar');

    await execPromise;
  });
});

test('dispose should end ssh2 client', () => {
  const podmanSSH = new PodmanSSH(SSH_CONFIG_MOCK);
  podmanSSH.dispose();

  expect(Client.prototype.end).toHaveBeenCalledOnce();
});
