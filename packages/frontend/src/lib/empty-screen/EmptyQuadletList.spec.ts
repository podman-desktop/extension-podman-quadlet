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

import '@testing-library/jest-dom/vitest';

import { fireEvent, render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import EmptyQuadletList from '/@/lib/empty-screen/EmptyQuadletList.svelte';
import * as connectionStore from '/@store/connections';
import * as synchronisationStore from '/@store/synchronisation';

import { readable } from 'svelte/store';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import type { SynchronisationInfo } from '/@shared/src/models/synchronisation';
import type {} from 'svelte';

// mock stores
vi.mock(import('/@store/connections'));
vi.mock(import('/@store/synchronisation'));

// ui object
const WSL_RUNNING_PROVIDER_DETAILED_INFO: ProviderContainerConnectionDetailedInfo = {
  providerId: 'podman',
  name: 'podman-machine',
  vmType: 'WSL',
  status: 'started',
};

const WSL_STOPPED_PROVIDER_DETAILED_INFO: ProviderContainerConnectionDetailedInfo = {
  ...WSL_RUNNING_PROVIDER_DETAILED_INFO,
  status: 'stopped',
};

const WSL_SYNCHRONISATION_INFO: SynchronisationInfo = {
  connection: WSL_RUNNING_PROVIDER_DETAILED_INFO,
  timestamp: Date.now(),
};

interface TestCase {
  synchronisation: SynchronisationInfo[];
  connections: ProviderContainerConnectionDetailedInfo[];
  name: string;
  message: string;
}

test.each([
  {
    synchronisation: [],
    connections: [],
    message: 'No running connection could be found',
    name: 'no container connections should say no running connection could be found',
  },
  {
    synchronisation: [],
    connections: [WSL_STOPPED_PROVIDER_DETAILED_INFO],
    message: 'No running connection could be found',
    name: 'one stopped container connections should say no running connection could be found',
  },
  {
    synchronisation: [],
    connections: [WSL_RUNNING_PROVIDER_DETAILED_INFO],
    message: 'Extension is out of sync',
    name: 'one running container connections without synchronisation should say Extension is out of sync',
  },
  {
    synchronisation: [WSL_SYNCHRONISATION_INFO],
    connections: [WSL_RUNNING_PROVIDER_DETAILED_INFO],
    message: 'No Quadlet found on the system',
    name: 'one running container connections with synchronisation should say No Quadlet found on the system',
  },
])('$name', async ({ synchronisation, connections, message }: TestCase): Promise<void> => {
  vi.mocked(connectionStore).providerConnectionsInfo = readable(connections);
  vi.mocked(synchronisationStore).synchronisation = readable(synchronisation);

  const { getByText } = render(EmptyQuadletList, {
    refreshQuadlets: vi.fn(),
  });

  await vi.waitFor(() => {
    const element = getByText(message);
    expect(element).toBeDefined();
  });
});

test('refresh button should call provider callback', async () => {
  vi.mocked(connectionStore).providerConnectionsInfo = readable([WSL_RUNNING_PROVIDER_DETAILED_INFO]);
  vi.mocked(synchronisationStore).synchronisation = readable([]);

  const refreshMock = vi.fn();
  const { getByRole } = render(EmptyQuadletList, {
    refreshQuadlets: refreshMock,
  });

  const button = await vi.waitFor(() => {
    const element = getByRole('button', { name: 'Refresh' });
    expect(element).toBeDefined();
    return element;
  });
  await fireEvent.click(button);

  await vi.waitFor(() => {
    expect(refreshMock).toHaveBeenCalledOnce();
  });
});

test('refresh button should be disabled if disable props is true', async () => {
  vi.mocked(connectionStore).providerConnectionsInfo = readable([WSL_STOPPED_PROVIDER_DETAILED_INFO]);
  vi.mocked(synchronisationStore).synchronisation = readable([]);

  const { getByRole } = render(EmptyQuadletList, {
    refreshQuadlets: vi.fn(),
    disabled: true,
  });

  const button = await vi.waitFor(() => {
    const element = getByRole('button', { name: 'Refresh' });
    expect(element).toBeDefined();
    return element;
  });

  await vi.waitFor(() => {
    expect(button).toBeDisabled();
  });
});
