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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type {
  QuadletInfo,
  ProviderContainerConnectionDetailedInfo,
  ServiceQuadlet,
  TemplateQuadlet,
  QuadletApi,
  LoggerApi,
  ProviderApi,
  RpcBrowser,
} from '@podman-desktop/quadlet-extension-core-api';
import { QuadletType } from '@podman-desktop/quadlet-extension-core-api';
import { readable, get } from 'svelte/store';
import * as connectionStore from '/@store/connections';
import QuadletDetails from '/@/pages/QuadletDetails.svelte';
import { router } from 'tinro';
import { quadletAPI } from '/@/api/client';
import XTerminal from '/@/lib/terminal/XTerminal.svelte';

// mock clients
vi.mock(import('/@/api/client'), () => ({
  providerAPI: {} as unknown as ProviderApi,
  quadletAPI: {
    createQuadletLogger: vi.fn(),
    read: vi.fn(),
  } as unknown as QuadletApi,
  loggerAPI: {} as unknown as LoggerApi,
  rpcBrowser: {} as unknown as RpcBrowser,
}));
// mock stores
vi.mock(import('/@store/connections'));
vi.mock(import('/@store/quadlets'));
vi.mock(import('/@store/logger-store'));
// mock component
vi.mock(import('/@/lib/monaco-editor/MonacoEditor.svelte'));
vi.mock(import('/@/lib/terminal/XTerminal.svelte'));

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
  files: [],
};

const CONTAINER_TEMPLATE_QUADLET_MOCK: QuadletInfo & ServiceQuadlet & TemplateQuadlet = {
  connection: WSL_PROVIDER_DETAILED_INFO,
  id: `foo-container-template-id`,
  service: 'foo@.service',
  content: 'dummy-content',
  state: 'unknown',
  path: `bar/foo@.container`,
  type: QuadletType.CONTAINER,
  requires: [],
  template: 'foo',
  defaultInstance: undefined,
  files: [],
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
  files: [],
};

const INVALID_IMAGE_QUADLET_MOCK: QuadletInfo = {
  // either WSL either QEMU
  connection: WSL_PROVIDER_DETAILED_INFO,
  id: `foo-invalid-image-id`,
  state: 'active',
  path: `bar/foo.image`,
  type: QuadletType.IMAGE,
  requires: [],
  files: [],
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
  files: [
    {
      name: 'play.yaml',
      path: '/mnt/bar/play.yaml',
    },
  ],
  service: undefined,
};

const MULTI_RESOURCES_QUADLET_MOCK: QuadletInfo = {
  ...CONTAINER_QUADLET_MOCK,
  id: `multi-resources-id`,
  files: [
    {
      name: '1.env',
      path: '/mnt/1.env',
    },
    {
      name: '2.env',
      path: '/mnt/2.env',
    },
    {
      name: '3.env',
      path: '/mnt/3.env',
    },
  ],
};

const SERVICE_LESS_QUADLET_MOCK: QuadletInfo = {
  connection: WSL_PROVIDER_DETAILED_INFO,
  id: `service-less-quadlet`,
  files: [],
  path: '/mtn/error',
  type: QuadletType.CONTAINER,
  requires: [],
  service: undefined,
  state: 'error',
};

const ERROR_QUADLET_MOCK: QuadletInfo = {
  ...SERVICE_LESS_QUADLET_MOCK,
  id: `service-less-with-error-quadlet`,
  stderr: 'foo error\nbar error',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(quadletStore).quadletsInfo = readable([
    CONTAINER_QUADLET_MOCK,
    IMAGE_QUADLET_MOCK,
    KUBE_QUADLET_MOCK,
    INVALID_IMAGE_QUADLET_MOCK,
    CONTAINER_TEMPLATE_QUADLET_MOCK,
    MULTI_RESOURCES_QUADLET_MOCK,
    SERVICE_LESS_QUADLET_MOCK,
    ERROR_QUADLET_MOCK,
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

describe('resources', () => {
  test('kube quadlet should have kube yaml tab', async () => {
    const { getByText } = render(QuadletDetails, {
      connection: WSL_PROVIDER_DETAILED_INFO.name,
      providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
      id: KUBE_QUADLET_MOCK.id,
    });

    const kubeTab = getByText('play.yaml');
    expect(kubeTab).toBeInTheDocument();
  });

  test('every resources should have a corresponding tab', async () => {
    const { getByText } = render(QuadletDetails, {
      connection: WSL_PROVIDER_DETAILED_INFO.name,
      providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
      id: MULTI_RESOURCES_QUADLET_MOCK.id,
    });

    for (const { name } of MULTI_RESOURCES_QUADLET_MOCK.files) {
      const kubeTab = getByText(name);
      expect(kubeTab).toBeInTheDocument();
    }
  });
});

test('quadletAPI.read error should be displayed', async () => {
  const ERROR_READ_MOCK = 'error reading quadlet';
  vi.mocked(quadletAPI.read).mockRejectedValue(new Error(ERROR_READ_MOCK));

  const { getByRole } = render(QuadletDetails, {
    connection: WSL_PROVIDER_DETAILED_INFO.name,
    providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
    id: KUBE_QUADLET_MOCK.id,
  });

  await vi.waitFor(() => {
    const alert = getByRole('alert', { name: 'Error Message Content' });
    expect(alert).toHaveTextContent(ERROR_READ_MOCK);
  });
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

describe('logs tab', () => {
  test('valid container quadlet should have logs tab', async () => {
    const { getByText } = render(QuadletDetails, {
      connection: WSL_PROVIDER_DETAILED_INFO.name,
      providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
      id: CONTAINER_QUADLET_MOCK.id,
    });

    await vi.waitFor(() => {
      const logs = getByText('Logs');
      expect(logs).toBeDefined();
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

  test('template quadlet should not have logs tab', async () => {
    const { queryByText } = render(QuadletDetails, {
      connection: WSL_PROVIDER_DETAILED_INFO.name,
      providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
      id: CONTAINER_TEMPLATE_QUADLET_MOCK.id,
    });

    const logs = queryByText('Logs');
    expect(logs).toBeNull();
  });
});

describe('error tab', () => {
  test('valid container quadlet should have not have error tab', async () => {
    const { queryByText } = render(QuadletDetails, {
      connection: WSL_PROVIDER_DETAILED_INFO.name,
      providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
      id: CONTAINER_QUADLET_MOCK.id,
    });

    const error = queryByText('Error');
    expect(error).toBeNull();
  });

  test('service less quadlet without stderr should not have an error tab', async () => {
    expect(SERVICE_LESS_QUADLET_MOCK.stderr).toBeUndefined();

    const { queryByText } = render(QuadletDetails, {
      connection: WSL_PROVIDER_DETAILED_INFO.name,
      providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
      id: SERVICE_LESS_QUADLET_MOCK.id,
    });

    const error = queryByText('Error');
    expect(error).toBeNull();
  });

  test('service less quadlet with stderr should have an error tab', async () => {
    expect(ERROR_QUADLET_MOCK.stderr).toBeDefined();

    const { getByText } = render(QuadletDetails, {
      connection: WSL_PROVIDER_DETAILED_INFO.name,
      providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
      id: ERROR_QUADLET_MOCK.id,
    });

    await vi.waitFor(() => {
      const error = getByText('Error');
      expect(error).toBeDefined();
    });
  });

  test('error tab should display stderr in terminal', async () => {
    render(QuadletDetails, {
      connection: WSL_PROVIDER_DETAILED_INFO.name,
      providerId: WSL_PROVIDER_DETAILED_INFO.providerId,
      id: ERROR_QUADLET_MOCK.id,
    });

    expect(XTerminal).not.toHaveBeenCalled();

    // go to logs tab
    router.goto('/error');

    await vi.waitFor(() => {
      expect(XTerminal).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          readonly: true,
        }),
      );
    });

    const props = vi.mocked(XTerminal).mock.calls[0][1];
    const content = get(props.store);
    expect(content).toEqual(ERROR_QUADLET_MOCK.stderr);
  });
});
