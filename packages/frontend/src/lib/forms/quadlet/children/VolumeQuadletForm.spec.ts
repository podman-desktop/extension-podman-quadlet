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
import VolumeQuadletForm from './VolumeQuadletForm.svelte';
import type {
  ProviderContainerConnectionDetailedInfo,
  SimpleVolumeInfo,
} from '@podman-desktop/quadlet-extension-core-api';
import { volumeAPI } from '/@/api/client';
import { SvelteSelectHelper } from '/@/lib/select/svelte-select-helper.spec';

// mock clients
vi.mock(import('/@/api/client'), () => ({
  volumeAPI: {
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

const SIMPLE_VOLUME_INFO: SimpleVolumeInfo = {
  name: 'dummy-volume-info',
  driver: 'local',
  mountpoint: '/var/lib/containers/storage/volumes/dummy-volume-info/_data',
  connection: WSL_PROVIDER_DETAILED_INFO,
};

describe('disabled', () => {
  test('undefined provider should disable input', async () => {
    const { getByLabelText } = render(VolumeQuadletForm, {
      loading: false,
      resourceId: undefined,
      provider: undefined,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: false,
      onGenerated: vi.fn(),
      close: vi.fn(),
    });

    const input = getByLabelText('Select Volume');
    expect(input).toBeDisabled();
  });

  test('disabled property should disable input', async () => {
    const { getByLabelText } = render(VolumeQuadletForm, {
      loading: false,
      resourceId: undefined,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: true,
      onGenerated: vi.fn(),
      close: vi.fn(),
    });

    const input = getByLabelText('Select Volume');
    expect(input).toBeDisabled();
  });

  test('loading property should disable input', async () => {
    const { getByLabelText } = render(VolumeQuadletForm, {
      loading: true,
      resourceId: undefined,
      provider: WSL_PROVIDER_DETAILED_INFO,
      onError: vi.fn(),
      onChange: vi.fn(),
      disabled: false,
      onGenerated: vi.fn(),
      close: vi.fn(),
    });

    const input = getByLabelText('Select Volume');
    expect(input).toBeDisabled();
  });
});

test('expect volumes to be listed properly', async () => {
  vi.mocked(volumeAPI.all).mockResolvedValue([SIMPLE_VOLUME_INFO]);

  const { container } = render(VolumeQuadletForm, {
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
    expect(volumeAPI.all).toHaveBeenCalledWith(WSL_PROVIDER_DETAILED_INFO);
  });

  const select = new SvelteSelectHelper(container, 'Select Volume');
  const item = await vi.waitFor(async () => {
    // get all options available
    const items: string[] = await select.getOptions();
    // ensure we have one option
    expect(items).toHaveLength(1);
    return items[0];
  });

  expect(item).toBe(SIMPLE_VOLUME_INFO.name);
});

test('expect error to be called if volumeAPI.all fails', async () => {
  vi.mocked(volumeAPI.all).mockRejectedValue(new Error('api error'));
  const onErrorMock = vi.fn();

  render(VolumeQuadletForm, {
    loading: false,
    resourceId: undefined,
    provider: WSL_PROVIDER_DETAILED_INFO,
    onError: onErrorMock,
    onChange: vi.fn(),
    disabled: false,
    onGenerated: vi.fn(),
    close: vi.fn(),
  });

  await vi.waitFor(() => {
    expect(onErrorMock).toHaveBeenCalledWith(expect.stringContaining('api error'));
  });
});
