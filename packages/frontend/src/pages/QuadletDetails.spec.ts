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

import { render, within } from '@testing-library/svelte';
import * as quadletStore from '/@store/quadlets';
import { beforeEach, expect, test, vi, describe } from 'vitest';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import { readable } from 'svelte/store';
import * as connectionStore from '/@store/connections';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import QuadletDetails from '/@/pages/QuadletDetails.svelte';
import { router } from 'tinro';

// mock clients
vi.mock('/@/api/client', () => ({
  providerAPI: {},
  quadletAPI: {
    createQuadletLogger: vi.fn(),
    read: vi.fn(),
  },
  loggerAPI: {},
  rpcBrowser: {},
}));
// mock stores
vi.mock('/@store/connections');
vi.mock('/@store/quadlets');
vi.mock('/@store/logger-store');
// mock component
vi.mock('/@/lib/monaco-editor/MonacoEditor.svelte');
vi.mock('/@/lib/terminal/XTerminal.svelte');

// ui object
const WSL_PROVIDER_DETAILED_INFO: ProviderContainerConnectionDetailedInfo = {
  providerId: 'podman',
  name: 'podman-machine',
  vmType: 'WSL',
  status: 'started',
};

const CONTAINER_QUADLET_MOCK: QuadletInfo = {
  connection: WSL_PROVIDER_DETAILED_INFO,
  id: `foo-container-id`,
  service: 'foo-container.service',
  content: 'dummy-content',
  state: 'active',
  path: `bar/foo.container`,
  type: QuadletType.CONTAINER,
  requires: [],
};

const IMAGE_QUADLET_MOCK: QuadletInfo = {
  // either WSL either QEMU
  connection: WSL_PROVIDER_DETAILED_INFO,
  id: `foo-image-id`,
  service: 'foo-image.service',
  content: 'dummy-content',
  state: 'active',
  path: `bar/foo.image`,
  type: QuadletType.IMAGE,
  requires: [],
};

const INVALID_IMAGE_QUADLET_MOCK: QuadletInfo = {
  // either WSL either QEMU
  connection: WSL_PROVIDER_DETAILED_INFO,
  id: `foo-invalid-image-id`,
  state: 'active',
  path: `bar/foo.image`,
  type: QuadletType.IMAGE,
  requires: [],
  service: undefined,
};

const KUBE_QUADLET_MOCK: QuadletInfo = {
  // either WSL either QEMU
  connection: WSL_PROVIDER_DETAILED_INFO,
  id: `foo.kube`,
  state: 'active',
  path: `bar/foo.kube`,
  type: QuadletType.KUBE,
  requires: [],
  service: undefined,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(quadletStore).quadletsInfo = readable([
    CONTAINER_QUADLET_MOCK,
    IMAGE_QUADLET_MOCK,
    KUBE_QUADLET_MOCK,
    INVALID_IMAGE_QUADLET_MOCK,
  ]);
  vi.mocked(connectionStore).providerConnectionsInfo = readable([WSL_PROVIDER_DETAILED_INFO]);
});

test('container quadlet should have generated and source tab', async () => {
  const { getByText, queryByText } = render(QuadletDetails, {
    connection: WSL_PROVIDER_DETAILED_INFO.name,
    providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
    id: CONTAINER_QUADLET_MOCK.id,
  });

  const generateTab = getByText('Systemd Service');
  expect(generateTab).toBeInTheDocument();
  const sourceTab = getByText('Source');
  expect(sourceTab).toBeInTheDocument();
  const kubeTab = queryByText('kube yaml');
  expect(kubeTab).toBeNull();
});

test('invalid quadlet should not have generated tab', async () => {
  const { getByText, queryByText } = render(QuadletDetails, {
    connection: WSL_PROVIDER_DETAILED_INFO.name,
    providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
    id: INVALID_IMAGE_QUADLET_MOCK.id,
  });

  // generate should not be in the visible
  const generateTab = queryByText('Systemd Service');
  expect(generateTab).toBeNull();

  // source should be visible
  const sourceTab = getByText('Source');
  expect(sourceTab).toBeInTheDocument();
});

test('kube quadlet should have kube yaml tab', async () => {
  const { getByText } = render(QuadletDetails, {
    connection: WSL_PROVIDER_DETAILED_INFO.name,
    providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
    id: KUBE_QUADLET_MOCK.id,
  });

  const kubeTab = getByText('kube yaml');
  expect(kubeTab).toBeInTheDocument();
});

describe('title', () => {
  test('should use quadlet#service if defined', async () => {
    const { getByRole } = render(QuadletDetails, {
      connection: WSL_PROVIDER_DETAILED_INFO.name,
      providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
      id: CONTAINER_QUADLET_MOCK.id,
    });

    const navigation = getByRole('navigation', {
      name: 'Breadcrumb',
    });
    const breadcrumb = within(navigation).getByLabelText('Page Name');
    expect(breadcrumb.textContent).toBe(CONTAINER_QUADLET_MOCK.service);
  });

  test('should use quadlet#path if service is undefined', async () => {
    const { getByRole } = render(QuadletDetails, {
      connection: WSL_PROVIDER_DETAILED_INFO.name,
      providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
      id: INVALID_IMAGE_QUADLET_MOCK.id,
    });
    // ensure the service is undefined
    expect(INVALID_IMAGE_QUADLET_MOCK.service).toBeUndefined();
    const navigation = getByRole('navigation', {
      name: 'Breadcrumb',
    });
    const breadcrumb = within(navigation).getByLabelText('Page Name');
    expect(breadcrumb.textContent).toBe('foo.image');
  });
});

test('logs tab should have expected journalctl command', async () => {
  const { getByRole } = render(QuadletDetails, {
    connection: WSL_PROVIDER_DETAILED_INFO.name,
    providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
    id: CONTAINER_QUADLET_MOCK.id,
  });

  // go to logs tab
  router.goto('/logs');

  await vi.waitFor(() => {
    const command = getByRole('banner', { name: 'journactl command' });
    expect(command.textContent).toBe(`journalctl --user --follow --unit=${CONTAINER_QUADLET_MOCK.service}`);
  });
});
