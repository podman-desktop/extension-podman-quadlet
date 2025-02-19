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

import * as connectionStore from '/@store/connections';
import { beforeEach, expect, test, vi } from 'vitest';
import QuadletsList from '/@/pages/QuadletsList.svelte';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import { readable } from 'svelte/store';
import * as quadletStore from '/@store/quadlets';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import { dialogAPI, quadletAPI } from '/@/api/client';
import { router } from 'tinro';
import { QuadletType } from '/@shared/src/utils/quadlet-type';

// ui object
const WSL_PROVIDER_DETAILED_INFO: ProviderContainerConnectionDetailedInfo = {
  providerId: 'podman',
  name: 'podman-machine',
  vmType: 'WSL',
  status: 'started',
};

// ui object
const QEMU_PROVIDER_DETAILED_INFO: ProviderContainerConnectionDetailedInfo = {
  providerId: 'podman',
  name: 'podman-machine-qemu',
  vmType: 'qemi',
  status: 'started',
};

// mock clients
vi.mock('/@/api/client', () => ({
  providerAPI: {},
  quadletAPI: {
    remove: vi.fn(),
    refresh: vi.fn(),
  },
  dialogAPI: {
    showWarningMessage: vi.fn(),
  },
}));
// mock stores
vi.mock('/@store/connections');
vi.mock('/@store/quadlets');
vi.mock('/@store/synchronisation');
// mock utils
vi.mock('tinro');
// mock components
vi.mock('/@/lib/empty-screen/EmptyQuadletList.svelte');

const QUADLETS_MOCK: QuadletInfo[] = Array.from({ length: 10 }, (_, index) => ({
  // either WSL either QEMU
  connection: index % 2 === 0 ? WSL_PROVIDER_DETAILED_INFO : QEMU_PROVIDER_DETAILED_INFO,
  id: `foo-${index}.container`,
  content: 'dummy-content',
  state: 'active',
  path: `bar/foo-${index}.container`,
  type: QuadletType.CONTAINER,
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(quadletStore).quadletsInfo = readable(QUADLETS_MOCK);
  vi.mocked(connectionStore).providerConnectionsInfo = readable([
    WSL_PROVIDER_DETAILED_INFO,
    QEMU_PROVIDER_DETAILED_INFO,
  ]);
});

test('all quadlets should be visible', async () => {
  const { getByText } = render(QuadletsList);

  for (const quadlet of QUADLETS_MOCK) {
    const div = getByText(quadlet.id);
    expect(div).toBeInTheDocument();
  }
});

test('Generate Quadlet button should redirect to generate form', async () => {
  const { getByRole } = render(QuadletsList);

  const generateBtn = getByRole('button', { name: 'Generate Quadlet' });
  await fireEvent.click(generateBtn);

  expect(router.goto).toHaveBeenCalledWith('/quadlets/generate');
});

test('Refresh Quadlet button should call ', async () => {
  const { getByRole } = render(QuadletsList);

  const refreshBtn = getByRole('button', { name: 'Refresh' });
  await fireEvent.click(refreshBtn);

  expect(quadletAPI.refresh).toHaveBeenCalled();
});

test('Refresh Quadlet button should be disabled if no provider is available', async () => {
  // mock no quadlets
  vi.mocked(quadletStore).quadletsInfo = readable([]);
  // mock no providers
  vi.mocked(connectionStore).providerConnectionsInfo = readable([]);

  const { getByRole } = render(QuadletsList);

  const refreshBtn = getByRole('button', { name: 'Refresh' });
  await fireEvent.click(refreshBtn);

  expect(quadletAPI.refresh).toHaveBeenCalled();
});

test('Refresh Quadlet button should be disabled if only stopped provider are available', async () => {
  // mock no quadlets
  vi.mocked(quadletStore).quadletsInfo = readable([]);
  // mock no providers
  vi.mocked(connectionStore).providerConnectionsInfo = readable([
    {
      ...WSL_PROVIDER_DETAILED_INFO,
      status: 'stopped',
    },
  ]);

  const { getByRole } = render(QuadletsList);

  const refreshBtn = getByRole('button', { name: 'Refresh' });
  await fireEvent.click(refreshBtn);

  expect(quadletAPI.refresh).toHaveBeenCalled();
});

test('removing all quadlets should call quadletAPI#remove for each connection', async () => {
  vi.mocked(dialogAPI.showWarningMessage).mockResolvedValue('Confirm');

  const { getByRole } = render(QuadletsList);

  // get toggle all checkbox
  const toggleAll = getByRole('checkbox', { name: 'Toggle all' });
  await fireEvent.click(toggleAll);

  // ensure we select all
  const deleteSelected = await vi.waitFor(() => {
    const button = getByRole('button', { name: `Delete ${QUADLETS_MOCK.length} selected items` });
    expect(button).toBeEnabled();
    return button as HTMLButtonElement;
  });

  // delete all
  await fireEvent.click(deleteSelected);

  // ensure dialog is the one expected
  expect(dialogAPI.showWarningMessage).toHaveBeenCalledWith(
    'Are you sure you want to delete 10 quadlets?',
    'Confirm',
    'Cancel',
  );

  // We have two provider, so should have call it twice
  expect(quadletAPI.remove).toHaveBeenCalledTimes(2);

  // ensure we get the right calls for each provider
  expect(quadletAPI.remove).toHaveBeenCalledWith(
    QEMU_PROVIDER_DETAILED_INFO,
    ...QUADLETS_MOCK.filter(quadlet => quadlet.connection === QEMU_PROVIDER_DETAILED_INFO).map(({ id }) => id),
  );

  expect(quadletAPI.remove).toHaveBeenCalledWith(
    WSL_PROVIDER_DETAILED_INFO,
    ...QUADLETS_MOCK.filter(quadlet => quadlet.connection === WSL_PROVIDER_DETAILED_INFO).map(({ id }) => id),
  );
});
