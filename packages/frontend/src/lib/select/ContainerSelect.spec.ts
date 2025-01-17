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

import { render } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';
import ContainersSelect from '/@/lib/select/ContainersSelect.svelte';
import type { SimpleContainerInfo } from '/@shared/src/models/simple-container-info';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import { SvelteSelectHelper } from '/@/lib/select/svelte-select-helper.spec';

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

beforeEach(() => {
  vi.resetAllMocks();
});

test('containers should be listed properly', async () => {
  const { container } = render(ContainersSelect, {
    containers: [SIMPLE_CONTAINER_INFO],
    value: undefined,
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
