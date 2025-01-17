/**********************************************************************
 * Copyright (C) 2024 Red Hat, Inc.
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
import { beforeEach, expect, test, vi } from 'vitest';
import { render, within } from '@testing-library/svelte';
import ContainerProviderConnectionSelect from '/@/lib/select/ContainerProviderConnectionSelect.svelte';
import { VMType } from '/@shared/src/utils/vm-types';
import type { ProviderContainerConnectionDetailedInfo } from '/@shared/src/models/provider-container-connection-detailed-info';
import { SvelteSelectHelper } from '/@/lib/select/svelte-select-helper.spec';

beforeEach(() => {
  vi.resetAllMocks();
  // mock scrollIntoView
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const wslConnection: ProviderContainerConnectionDetailedInfo = {
  name: 'Machine 1',
  status: 'started',
  providerId: 'podman',
  vmType: VMType.WSL,
};

const qemuConnection: ProviderContainerConnectionDetailedInfo = {
  name: 'Machine 2',
  status: 'started',
  providerId: 'podman',
  vmType: VMType.QEMU,
};

test('Should list all container provider connections', async () => {
  const { container } = render(ContainerProviderConnectionSelect, {
    value: undefined,
    containerProviderConnections: [wslConnection, qemuConnection],
  });

  // first get the select input
  const select = new SvelteSelectHelper(container, 'Select Container Engine');

  // get all options available
  const items: string[] = await select.getOptions();
  // ensure we have two options
  expect(items.length).toBe(2);
  expect(items[0]).toContain(wslConnection.name);
  expect(items[1]).toContain(qemuConnection.name);
});

test('default value should be visible', async () => {
  const { container } = render(ContainerProviderConnectionSelect, {
    value: qemuConnection,
    containerProviderConnections: [wslConnection, qemuConnection],
  });

  // first get the select input
  const select = within(container).getByText(qemuConnection.name);
  expect(select).toBeDefined();
});
