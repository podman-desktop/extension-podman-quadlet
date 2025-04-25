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
import { vi, test, expect, beforeEach, assert, describe } from 'vitest';
import { PodmanSSH } from './podman-ssh';
import { Client, type ConnectConfig } from 'ssh2';

vi.mock(import('ssh2'));

const SSH_CONFIG_MOCK: ConnectConfig = {
  host: 'localhost',
  port: 2222,
  username: 'potatoes',
  privateKey: '==content==',
};

const CLIENT_MOCK: Client = {
  on: vi.fn(),
  connect: vi.fn(),
  end: vi.fn(),
  exec: vi.fn(),
} as unknown as Client;

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(Client).mockReturnValue(CLIENT_MOCK);
  vi.mocked(CLIENT_MOCK.on).mockReturnValue(CLIENT_MOCK);
});

function getEventListener(event: string): () => void {
  // ensure we registered a listener for ready event
  expect(CLIENT_MOCK.on).toHaveBeenCalledWith(event, expect.any(Function));

  // extract the listener
  const listener = vi
    .mocked(CLIENT_MOCK.on)
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
});

test('dispose should end ssh2 client', () => {
  const podmanSSH = new PodmanSSH(SSH_CONFIG_MOCK);
  podmanSSH.dispose();

  expect(CLIENT_MOCK.end).toHaveBeenCalledOnce();
});
