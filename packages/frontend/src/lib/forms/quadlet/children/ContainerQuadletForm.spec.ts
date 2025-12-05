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
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import { containerAPI } from '/@/api/client';
import type { SimpleContainerInfo } from '/@shared/src/models/simple-container-info';
import { SvelteSelectHelper } from '/@/lib/select/svelte-select-helper.spec';

// mock clients
vi.mock('/@/api/client', () => ({
  containerAPI: {
    all: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  // mock scrollIntoView
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
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
    });

    const input = getByLabelText('Select Container');
    expect(input).toBeDisabled();
  });

  test('disabled property should disable start on boot checkbox', async () => {
    const { getByLabelText } = render(ContainerQuadletForm, {
      loading: false,
      resourceId: undefined,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: true, // set disable true
    });

    const checkbox = getByLabelText('Start on boot');
    expect(checkbox).toBeDisabled();
  });

  test('disabled property should disable input', async () => {
    const { getByLabelText } = render(ContainerQuadletForm, {
      loading: false,
      resourceId: undefined,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: true, // set disable true
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
    });

    const input = getByLabelText('Select Container');
    expect(input).toBeDisabled();
  });

  test('loading property should disable start on boot checkbox', async () => {
    const { getByLabelText } = render(ContainerQuadletForm, {
      loading: true, // set loading true
      resourceId: undefined,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: false,
    });

    const checkbox = getByLabelText('Start on boot');
    expect(checkbox).toBeDisabled();
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

test('expect interaction with checkbox to trigger onChange props', async () => {
  vi.mocked(containerAPI.all).mockResolvedValue([SIMPLE_CONTAINER_INFO]);
  const onChangeMock = vi.fn();

  const { getByLabelText } = render(ContainerQuadletForm, {
    loading: false,
    resourceId: undefined,
    provider: WSL_PROVIDER_DETAILED_INFO,
    onError: vi.fn(),
    onChange: onChangeMock,
    disabled: false,
  });

  const checkbox = getByLabelText('Start on boot');
  await vi.waitFor(() => {
    expect(checkbox).toBeEnabled();
  });

  await fireEvent.click(checkbox);

  await vi.waitFor(() => {
    expect(onChangeMock).toHaveBeenCalledOnce();
  });
});
