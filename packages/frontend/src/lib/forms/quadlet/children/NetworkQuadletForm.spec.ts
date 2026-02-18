/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
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

import { render } from '@testing-library/svelte';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import NetworkQuadletForm from './NetworkQuadletForm.svelte';
import type {
  ProviderContainerConnectionDetailedInfo,
  SimpleNetworkInfo,
} from '@podman-desktop/quadlet-extension-core-api';
import { networkAPI } from '/@/api/client';
import { SvelteSelectHelper } from '/@/lib/select/svelte-select-helper.spec';

// mock clients
vi.mock(import('/@/api/client'), () => ({
  networkAPI: {
    all: vi.fn(),
  },
}));
vi.mock(import('tinro'));

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

const SIMPLE_NETWORK_INFO: SimpleNetworkInfo = {
  id: 'dummy-network-id',
  name: 'dummy-network-name',
  driver: 'bridge',
  connection: WSL_PROVIDER_DETAILED_INFO,
};

describe('disabled', () => {
  test('undefined provider should disable input', async () => {
    const { getByLabelText } = render(NetworkQuadletForm, {
      loading: false,
      resourceId: undefined,
      provider: undefined,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: false,
    });

    const input = getByLabelText('Select Network');
    expect(input).toBeDisabled();
  });

  test('disabled property should disable input', async () => {
    const { getByLabelText } = render(NetworkQuadletForm, {
      loading: false,
      resourceId: undefined,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: true,
    });

    const input = getByLabelText('Select Network');
    expect(input).toBeDisabled();
  });

  test('loading property should disable input', async () => {
    const { getByLabelText } = render(NetworkQuadletForm, {
      loading: true,
      resourceId: undefined,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: false,
    });

    const input = getByLabelText('Select Network');
    expect(input).toBeDisabled();
  });
});

test('expect networks to be listed properly', async () => {
  vi.mocked(networkAPI.all).mockResolvedValue([SIMPLE_NETWORK_INFO]);

  const { container } = render(NetworkQuadletForm, {
    loading: false,
    resourceId: undefined,
    provider: WSL_PROVIDER_DETAILED_INFO,
    onError: vi.fn(),
    onChange: vi.fn(),
    disabled: false,
  });

  await vi.waitFor(() => {
    expect(networkAPI.all).toHaveBeenCalledWith(WSL_PROVIDER_DETAILED_INFO);
  });

  const select = new SvelteSelectHelper(container, 'Select Network');
  const item = await vi.waitFor(async () => {
    // get all options available
    const items: string[] = await select.getOptions();
    // ensure we have one option
    expect(items).toHaveLength(1);
    return items[0];
  });

  expect(item).toBe(SIMPLE_NETWORK_INFO.name);
});

test('expect error to be called if networkAPI.all fails', async () => {
  vi.mocked(networkAPI.all).mockRejectedValue(new Error('api error'));
  const onErrorMock = vi.fn();

  render(NetworkQuadletForm, {
    loading: false,
    resourceId: undefined,
    provider: WSL_PROVIDER_DETAILED_INFO,
    onError: onErrorMock,
    onChange: vi.fn(),
    disabled: false,
  });

  await vi.waitFor(() => {
    expect(onErrorMock).toHaveBeenCalledWith(expect.stringContaining('api error'));
  });
});
