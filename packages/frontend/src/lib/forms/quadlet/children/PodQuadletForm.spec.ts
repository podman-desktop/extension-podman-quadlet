/**********************************************************************
 * Copyright (C) 2025-2026 Red Hat, Inc.
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
import PodQuadletForm from '/@/lib/forms/quadlet/children/PodQuadletForm.svelte';
import type {
  ProviderContainerConnectionDetailedInfo,
  SimplePodInfo,
} from '@podman-desktop/quadlet-extension-core-api';
import { podAPI } from '/@/api/client';
import { SvelteSelectHelper } from '/@/lib/select/svelte-select-helper.spec';

// mock clients
vi.mock(import('/@/api/client'), () => ({
  podAPI: {
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

const SIMPLE_POD_INFO: SimplePodInfo = {
  name: 'dummy-pod-info',
  connection: WSL_PROVIDER_DETAILED_INFO,
  status: 'Running',
  id: 'dummy-pod-id',
  containers: [],
};

describe('disabled', () => {
  test('undefined provider should disable input', async () => {
    const { getByLabelText } = render(PodQuadletForm, {
      loading: false,
      resourceId: undefined,
      provider: undefined,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: false,
    });

    const input = getByLabelText('Select Pod');
    expect(input).toBeDisabled();
  });

  test('disabled property should disable input', async () => {
    const { getByLabelText } = render(PodQuadletForm, {
      loading: false,
      resourceId: undefined,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: true,
    });

    const input = getByLabelText('Select Pod');
    expect(input).toBeDisabled();
  });

  test('loading property should disable input', async () => {
    const { getByLabelText } = render(PodQuadletForm, {
      loading: true,
      resourceId: undefined,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: false,
    });

    const input = getByLabelText('Select Pod');
    expect(input).toBeDisabled();
  });
});

test('expect pods to be listed properly', async () => {
  vi.mocked(podAPI.all).mockResolvedValue([SIMPLE_POD_INFO]);

  const { container } = render(PodQuadletForm, {
    loading: false,
    resourceId: undefined,
    provider: WSL_PROVIDER_DETAILED_INFO,
    onError: vi.fn(),
    onChange: vi.fn(),
    disabled: false,
  });

  await vi.waitFor(() => {
    expect(podAPI.all).toHaveBeenCalledWith(WSL_PROVIDER_DETAILED_INFO);
  });

  const select = new SvelteSelectHelper(container, 'Select Pod');
  const item = await vi.waitFor(async () => {
    // get all options available
    const items: string[] = await select.getOptions();
    // ensure we have one option
    expect(items).toHaveLength(1);
    return items[0];
  });

  expect(item).toBe(SIMPLE_POD_INFO.name);
});
