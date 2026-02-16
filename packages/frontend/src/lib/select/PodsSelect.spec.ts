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
import PodsSelect from './PodsSelect.svelte';
import { SvelteSelectHelper } from '/@/lib/select/svelte-select-helper.spec';
import type { SimplePodInfo } from '@podman-desktop/quadlet-extension-core-api';

beforeEach(() => {
  vi.resetAllMocks();
});

const POD1_MOCK: SimplePodInfo = {
  id: 'pod1',
  name: 'Pod 1',
  status: 'Running',
  containers: [
    {
      id: 'c1',
      name: 'container1',
      state: 'running',
      image: 'image1',
      connection: {
        name: 'conn1',
        providerId: 'p1',
      },
    },
  ],
  connection: {
    name: 'conn1',
    providerId: 'p1',
  },
};

const POD2_MOCK: SimplePodInfo = {
  id: 'pod2',
  name: 'Pod 2',
  status: 'Exited',
  containers: [],
  connection: {
    name: 'conn1',
    providerId: 'p1',
  },
};

test('Should list all pods', async () => {
  const { container } = render(PodsSelect, {
    value: undefined,
    pods: [POD1_MOCK, POD2_MOCK],
  });

  // first get the select input
  const select = new SvelteSelectHelper(container, 'Select Pod');

  // get all options available
  const items: string[] = await select.getOptions();
  // ensure we have two options
  expect(items).toHaveLength(2);
  expect(items[0]).toContain(POD1_MOCK.name);
  expect(items[1]).toContain(POD2_MOCK.name);
});

test('default value should be visible', async () => {
  const { container } = render(PodsSelect, {
    value: POD2_MOCK,
    pods: [POD1_MOCK, POD2_MOCK],
  });

  // first get the select input
  const select = within(container).getByText(POD2_MOCK.name);
  expect(select).toBeDefined();
});
