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

import { render, within } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';
import VolumesSelect from '/@/lib/select/VolumesSelect.svelte';
import type {
  SimpleVolumeInfo,
  ProviderContainerConnectionDetailedInfo,
} from '@podman-desktop/quadlet-extension-core-api';
import { SvelteSelectHelper } from '/@/lib/select/svelte-select-helper.spec';

// ui object
const WSL_PROVIDER_DETAILED_INFO: ProviderContainerConnectionDetailedInfo = {
  providerId: 'podman',
  name: 'podman-machine',
  vmType: 'WSL',
  status: 'started',
};

const SIMPLE_VOLUME_INFO: SimpleVolumeInfo = {
  name: 'dummy-volume',
  connection: WSL_PROVIDER_DETAILED_INFO,
  driver: 'local',
  mountpoint: '/var/lib/containers/storage/volumes/dummy-volume/_data',
};

beforeEach(() => {
  vi.resetAllMocks();
});

test('volumes should be listed properly', async () => {
  const { container } = render(VolumesSelect, {
    volumes: [SIMPLE_VOLUME_INFO],
    value: undefined,
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

test('default value should be visible', async () => {
  const { container } = render(VolumesSelect, {
    value: SIMPLE_VOLUME_INFO,
    volumes: [SIMPLE_VOLUME_INFO],
  });

  // first get the select input
  const select = within(container).getByText(SIMPLE_VOLUME_INFO.name);
  expect(select).toBeDefined();
});
