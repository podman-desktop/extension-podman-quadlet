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
import QuadletActions from '/@/lib/table/QuadletActions.svelte';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { dialogAPI, quadletAPI } from '/@/api/client';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import type { TemplateQuadlet } from '/@shared/src/models/template-quadlet';
import type { DialogApi } from '/@shared/src/apis/dialog-api';
import type { QuadletApi } from '/@shared/src/apis/quadlet-api';

vi.mock(import('/@/api/client'), () => ({
  dialogAPI: {
    showWarningMessage: vi.fn(),
  } as unknown as DialogApi,
  quadletAPI: {
    remove: vi.fn(),
  } as unknown as QuadletApi,
}));

beforeEach(() => {
  vi.resetAllMocks();
});

const PROVIDER_MOCK: ProviderContainerConnectionIdentifierInfo = {
  name: 'podman-machine-default',
  providerId: 'podman',
};

const QUADLET_MOCK: QuadletInfo = {
  id: `foo.container`,
  service: undefined,
  state: 'active',
  path: `bar/foo.container`,
  connection: PROVIDER_MOCK,
  type: QuadletType.CONTAINER,
  requires: [],
};

const TEMPLATE_QUADLET_MOCK: QuadletInfo & TemplateQuadlet = {
  id: 'foo-template-id',
  service: 'foo@.service',
  path: 'foo/bar@.container',
  state: 'unknown',
  content: 'dummy-content',
  type: QuadletType.CONTAINER,
  requires: [],
  template: 'foo',
  defaultInstance: undefined,
  connection: PROVIDER_MOCK,
};

const STARTABLE_TEMPLATE_QUADLET_MOCK: QuadletInfo & TemplateQuadlet = {
  ...TEMPLATE_QUADLET_MOCK,
  service: 'foo@bar.service',
  state: 'inactive',
  defaultInstance: 'bar',
};

test('expect active quadlet to have stop enabled', async () => {
  const { getByRole, queryByRole } = render(QuadletActions, {
    object: QUADLET_MOCK,
  });

  const stopBtn = getByRole('button', { name: 'Stop quadlet' });
  expect(stopBtn).toBeDefined();
  expect(stopBtn).toBeEnabled();

  const startBtn = queryByRole('button', { name: 'Start quadlet' });
  expect(startBtn).toBeNull();

  const removeBtn = getByRole('button', { name: 'Remove quadlet' });
  expect(removeBtn).toBeDefined();
  expect(removeBtn).toBeEnabled();
});

test('expect inactive quadlet to have start enabled', async () => {
  const { getByRole, queryByRole } = render(QuadletActions, {
    object: { ...QUADLET_MOCK, state: 'inactive' },
  });

  const startBtn = getByRole('button', { name: 'Start quadlet' });
  expect(startBtn).toBeDefined();
  expect(startBtn).toBeEnabled();

  const stopBtn = queryByRole('button', { name: 'Stop quadlet' });
  expect(stopBtn).toBeNull();

  const removeBtn = getByRole('button', { name: 'Remove quadlet' });
  expect(removeBtn).toBeDefined();
  expect(removeBtn).toBeEnabled();
});

test('expect remove action to use dialogAPI#showWarningMessage', async () => {
  const { getByRole } = render(QuadletActions, {
    object: QUADLET_MOCK,
  });

  const removeBtn = getByRole('button', { name: 'Remove quadlet' });
  await fireEvent.click(removeBtn);

  expect(dialogAPI.showWarningMessage).toHaveBeenCalledWith(
    `Are you sure you want to delete ${QUADLET_MOCK.path}?`,
    'Confirm',
    'Cancel',
  );
  expect(quadletAPI.remove).not.toHaveBeenCalled();
});

test('expect user confirm removal action to use quadletAPI#remove', async () => {
  vi.mocked(dialogAPI.showWarningMessage).mockResolvedValue('Confirm');

  const { getByRole } = render(QuadletActions, {
    object: QUADLET_MOCK,
  });

  const removeBtn = getByRole('button', { name: 'Remove quadlet' });
  await fireEvent.click(removeBtn);

  expect(dialogAPI.showWarningMessage).toHaveBeenCalled();
  await vi.waitFor(() => {
    expect(quadletAPI.remove).toHaveBeenCalledWith(PROVIDER_MOCK, QUADLET_MOCK.id);
  });
});

test('expect template quadlet to only have delete action', async () => {
  const { getByRole, queryByRole } = render(QuadletActions, {
    object: TEMPLATE_QUADLET_MOCK,
  });

  const startBtn = queryByRole('button', { name: 'Start quadlet' });
  expect(startBtn).toBeNull();

  const stopBtn = queryByRole('button', { name: 'Stop quadlet' });
  expect(stopBtn).toBeNull();

  const removeBtn = getByRole('button', { name: 'Remove quadlet' });
  expect(removeBtn).toBeDefined();
  expect(removeBtn).toBeEnabled();
});

test('expect startable template quadlet to have start action', async () => {
  const { queryByRole } = render(QuadletActions, {
    object: STARTABLE_TEMPLATE_QUADLET_MOCK,
  });

  const startBtn = queryByRole('button', { name: 'Start quadlet' });
  expect(startBtn).toBeDefined();
});
