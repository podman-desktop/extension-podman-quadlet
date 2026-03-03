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
import { expect, test, vi, describe, beforeEach } from 'vitest';
import ContainerQuadletForm from '/@/lib/forms/quadlet/children/ContainerQuadletForm.svelte';
import type {
  ProviderContainerConnectionDetailedInfo,
  SimpleContainerInfo,
} from '@podman-desktop/quadlet-extension-core-api';
import { containerAPI, podletAPI } from '/@/api/client';
import { SvelteSelectHelper } from '/@/lib/select/svelte-select-helper.spec';

// mock clients
vi.mock(import('/@/api/client'), () => ({
  containerAPI: {
    all: vi.fn(),
  },
  podletAPI: {
    generateContainer: vi.fn(),
    generateImage: vi.fn(),
    generatePod: vi.fn(),
    generateVolume: vi.fn(),
    generateNetwork: vi.fn(),
    compose: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  // mock scrollIntoView
  window.HTMLElement.prototype.scrollIntoView = vi.fn();

  vi.mocked(podletAPI.generateContainer).mockResolvedValue('dummy');
});

// ui object
const WSL_PROVIDER_DETAILED_INFO: ProviderContainerConnectionDetailedInfo = {
  providerId: 'podman',
  name: 'podman-machine',
  vmType: 'WSL',
  status: 'started',
};

const SIMPLE_CONTAINER_INFO: SimpleContainerInfo = {
  name: '/dummy-container-info',
  connection: WSL_PROVIDER_DETAILED_INFO,
  image: 'dummy-image',
  state: 'created',
  id: 'dummy-container-id',
};

describe('disabled', () => {
  test('undefined provider should disable input', async () => {
    const { getByLabelText } = render(ContainerQuadletForm, {
      loading: false,
      resourceId: undefined,
      provider: undefined, // set loading to undefined
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: false,
      onGenerated: vi.fn(),
      close: vi.fn(),
    });

    const input = getByLabelText('Select Container');
    expect(input).toBeDisabled();
  });

  test('disabled property should disable input', async () => {
    const { getByLabelText } = render(ContainerQuadletForm, {
      loading: false,
      resourceId: undefined,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: true, // set disable true
      onGenerated: vi.fn(),
      close: vi.fn(),
    });

    const input = getByLabelText('Select Container');
    expect(input).toBeDisabled();
  });

  test('loading property should disable input', async () => {
    const { getByLabelText } = render(ContainerQuadletForm, {
      loading: true, // set loading true
      resourceId: undefined,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: false,
      onGenerated: vi.fn(),
      close: vi.fn(),
    });

    const input = getByLabelText('Select Container');
    expect(input).toBeDisabled();
  });
});

test('expect containers to be listed properly', async () => {
  vi.mocked(containerAPI.all).mockResolvedValue([SIMPLE_CONTAINER_INFO]);

  const { container } = render(ContainerQuadletForm, {
    loading: false,
    resourceId: undefined,
    provider: WSL_PROVIDER_DETAILED_INFO,
    onError: vi.fn(),
    onChange: vi.fn(),
    disabled: false,
    onGenerated: vi.fn(),
    close: vi.fn(),
  });

  await vi.waitFor(() => {
    expect(containerAPI.all).toHaveBeenCalledWith(WSL_PROVIDER_DETAILED_INFO);
  });

  const select = new SvelteSelectHelper(container, 'Select Container');
  const item = await vi.waitFor(async () => {
    // get all options available
    const items: string[] = await select.getOptions();
    // ensure we have two options
    expect(items).toHaveLength(1);
    return items[0];
  });

  expect(item).toBe(SIMPLE_CONTAINER_INFO.name.substring(1));
});

describe('options', () => {
  beforeEach(() => {
    vi.mocked(containerAPI.all).mockResolvedValue([SIMPLE_CONTAINER_INFO]);
  });

  test('start on boot should be unchecked by default', async () => {
    const { getByRole } = render(ContainerQuadletForm, {
      loading: false,
      resourceId: SIMPLE_CONTAINER_INFO.id,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: false,
      onGenerated: vi.fn(),
      close: vi.fn(),
    });

    const generateBtn = await vi.waitFor(() => {
      const element = getByRole('button', { name: 'Generate' });
      expect(element).toBeEnabled();
      return element;
    });

    const checkbox = getByRole('checkbox', { name: 'Start on boot' });
    expect(checkbox).not.toBeChecked();

    await fireEvent.click(generateBtn);

    expect(podletAPI.generateContainer).toHaveBeenCalledWith(WSL_PROVIDER_DETAILED_INFO, SIMPLE_CONTAINER_INFO.id, {
      startOnBoot: false,
    });
  });

  test('start on boot checkbox value should be reflected in api', async () => {
    const { getByRole } = render(ContainerQuadletForm, {
      loading: false,
      resourceId: SIMPLE_CONTAINER_INFO.id,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: false,
      onGenerated: vi.fn(),
      close: vi.fn(),
    });

    const generateBtn = await vi.waitFor(() => {
      const element = getByRole('button', { name: 'Generate' });
      expect(element).toBeEnabled();
      return element;
    });

    const checkbox = getByRole('checkbox', { name: 'Start on boot' });
    expect(checkbox).not.toBeChecked();

    await fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();

    await fireEvent.click(generateBtn);

    expect(podletAPI.generateContainer).toHaveBeenCalledWith(WSL_PROVIDER_DETAILED_INFO, SIMPLE_CONTAINER_INFO.id, {
      startOnBoot: true,
    });
  });
});
