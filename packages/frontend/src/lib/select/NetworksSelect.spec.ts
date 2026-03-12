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
import { beforeEach, expect, test, vi } from 'vitest';
import { render, within } from '@testing-library/svelte';
import NetworksSelect from './NetworksSelect.svelte';
import { SvelteSelectHelper } from '/@/lib/select/svelte-select-helper.spec';
import type { SimpleNetworkInfo } from '@podman-desktop/quadlet-extension-core-api';

beforeEach(() => {
  vi.resetAllMocks();
});

const NETWORK1_MOCK: SimpleNetworkInfo = {
  id: 'network1',
  name: 'Network 1',
  driver: 'local',
  connection: {
    name: 'conn1',
    providerId: 'p1',
  },
};

const NETWORK2_MOCK: SimpleNetworkInfo = {
  id: 'network2',
  name: 'Network 2',
  driver: 'local',
  connection: {
    name: 'conn1',
    providerId: 'p1',
  },
};

test('Should list all networks', async () => {
  const { container } = render(NetworksSelect, {
    value: undefined,
    networks: [NETWORK1_MOCK, NETWORK2_MOCK],
  });

  // first get the select input
  const select = new SvelteSelectHelper(container, 'Select Network');

  // get all options available
  const items: string[] = await select.getOptions();
  // ensure we have two options
  expect(items).toHaveLength(2);
  expect(items[0]).toContain(NETWORK1_MOCK.name);
  expect(items[1]).toContain(NETWORK2_MOCK.name);
});

test('default value should be visible', async () => {
  const { container } = render(NetworksSelect, {
    value: NETWORK2_MOCK,
    networks: [NETWORK1_MOCK, NETWORK2_MOCK],
  });

  // first get the select input
  const select = within(container).getByText(NETWORK2_MOCK.name);
  expect(select).toBeDefined();
});
