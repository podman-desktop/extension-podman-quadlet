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
import { beforeEach, expect, test, vi } from 'vitest';
import App from '/@/App.svelte';
import QuadletGenerate from '/@/pages/QuadletGenerate.svelte';
import QuadletCompose from '/@/pages/QuadletCompose.svelte';
import { getRouterState, rpcBrowser } from '/@/api/client';

// mock clients
vi.mock(import('/@/api/client'));
// mock components
vi.mock(import('/@/pages/QuadletsList.svelte'));
vi.mock(import('/@/pages/QuadletDetails.svelte'));
vi.mock(import('/@/pages/QuadletGenerate.svelte'));
vi.mock(import('/@/pages/QuadletCompose.svelte'));
// mock utils
vi.mock(import('/@/lib/monaco-editor/monaco-environment'), () => ({}));
vi.mock(import('@fortawesome/fontawesome-free/css/all.min.css'), () => ({}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(rpcBrowser.subscribe).mockReturnValue({ unsubscribe: vi.fn() });
});

test('generate route should decode query parameters', async () => {
  const query = {
    providerId: 'podman',
    connection: 'podman-machine/default',
    quadletType: 'image',
    resourceId: 'quay.io/podman/hello@sha256:abc',
  };
  vi.mocked(getRouterState).mockResolvedValue({
    url: `/quadlets/generate?${new URLSearchParams(query).toString()}`,
  });

  render(App);

  await vi.waitFor(() => {
    expect(QuadletGenerate).toHaveBeenCalledWith(expect.anything(), query);
  });
});

test('compose route should decode query parameters', async () => {
  const query = {
    providerId: 'podman',
    connection: 'podman-machine-default',
    filepath: 'C:\\Users\\foo\\compose.yaml',
  };
  vi.mocked(getRouterState).mockResolvedValue({
    url: `/quadlets/compose?${new URLSearchParams(query).toString()}`,
  });

  render(App);

  await vi.waitFor(() => {
    expect(QuadletCompose).toHaveBeenCalledWith(expect.anything(), query);
  });
});
