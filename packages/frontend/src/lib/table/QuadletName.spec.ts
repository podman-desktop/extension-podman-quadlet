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
import { beforeEach, expect, test, vi } from 'vitest';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import QuadletName from '/@/lib/table/QuadletName.svelte';
import { router } from 'tinro';

// mock utils
vi.mock('tinro');

beforeEach(() => {
  vi.resetAllMocks();
});

const PROVIDER_MOCK: ProviderContainerConnectionIdentifierInfo = {
  name: 'podman-machine-default',
  providerId: 'podman',
};

const QUADLET_MOCK: QuadletInfo = {
  id: `dummy-id`,
  service: 'foo.service',
  content: 'dummy-content',
  state: 'active',
  path: `bar/foo.container`,
  connection: PROVIDER_MOCK,
  type: QuadletType.CONTAINER,
  requires: [],
  isTemplate: false,
};

test('expect quadlet with service name to use it', () => {
  const { getByRole } = render(QuadletName, {
    object: QUADLET_MOCK,
  });

  const btn = getByRole('button', { name: 'quadlet name' });
  expect(btn.textContent).toStrictEqual(QUADLET_MOCK.service);
});

test('expect quadlet without service name to use it', () => {
  const { getByRole } = render(QuadletName, {
    object: {
      ...QUADLET_MOCK,
      service: undefined,
    },
  });

  const btn = getByRole('button', { name: 'quadlet name' });
  expect(btn.textContent).toStrictEqual(QUADLET_MOCK.path);
});

test('clicking on quadlet name should redirect to details page', async () => {
  const { getByRole } = render(QuadletName, {
    object: {
      ...QUADLET_MOCK,
      service: undefined,
    },
  });

  const btn = getByRole('button', { name: 'quadlet name' });
  await fireEvent.click(btn);

  await vi.waitFor(() => {
    expect(router.goto).toHaveBeenCalledWith(
      `/quadlets/${PROVIDER_MOCK.providerId}/${PROVIDER_MOCK.name}/${QUADLET_MOCK.id}`,
    );
  });
});
