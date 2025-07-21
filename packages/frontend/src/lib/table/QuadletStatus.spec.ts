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
import type { QuadletState, QuadletInfo } from '/@shared/src/models/quadlet-info';

import QuadletStatus from '/@/lib/table/QuadletStatus.svelte';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import { StatusIcon } from '@podman-desktop/ui-svelte';
import FileCodeIcon from '/@/lib/table/FileCodeIcon.svelte';
import FileLinesIcon from '/@/lib/table/FileLinesIcon.svelte';
import type { Component } from 'svelte';

vi.mock('@podman-desktop/ui-svelte');

const PROVIDER_MOCK: ProviderContainerConnectionIdentifierInfo = {
  name: 'podman-machine-default',
  providerId: 'podman',
};

const QUADLET_MOCK: QuadletInfo = {
  id: `foo.container`,
  content: 'dummy-content',
  state: 'active',
  path: `bar/foo.container`,
  connection: PROVIDER_MOCK,
  type: QuadletType.CONTAINER,
  requires: [],
  isTemplate: false,
};

const TEMPLATE_QUADLET_MOCK: QuadletInfo = {
  id: `foo@.container`,
  content: 'dummy-content',
  state: 'active',
  path: `bar/foo@.container`,
  connection: PROVIDER_MOCK,
  type: QuadletType.CONTAINER,
  requires: [],
  isTemplate: true,
};

type TestCase = {
  state: QuadletState;
  status: string;
};

beforeEach(() => {
  vi.resetAllMocks();
});

test.each<TestCase>([
  {
    state: 'active',
    status: 'RUNNING',
  },
  {
    state: 'deleting',
    status: 'DELETING',
  },
  {
    state: 'error',
    status: 'DEGRADED',
  },
  {
    state: 'unknown',
    status: '',
  },
  {
    state: 'inactive',
    status: '',
  },
])('Quadlet with state $state should display status $status', async ({ state, status }) => {
  render(QuadletStatus, {
    object: {
      ...QUADLET_MOCK,
      state,
    },
  });

  await vi.waitFor(() => {
    expect(StatusIcon).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: status,
      }),
    );
  });
});

test.each<{ quadlet: QuadletInfo; icon: Component }>([
  {
    quadlet: QUADLET_MOCK,
    icon: FileLinesIcon,
  },
  {
    quadlet: TEMPLATE_QUADLET_MOCK,
    icon: FileCodeIcon,
  },
])(`quadlet $quadlet.id should display $icon`, ({ quadlet, icon }) => {
  render(QuadletStatus, {
    object: quadlet,
  });

  expect(StatusIcon).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      icon: icon,
    }),
  );
});
