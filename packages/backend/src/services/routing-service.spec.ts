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

import type { WebviewPanel } from '@podman-desktop/api';

import { beforeEach, vi, test, expect, describe } from 'vitest';
import { RoutingService } from '/@/services/routing-service';

const PANEL_MOCK: WebviewPanel = {
  webview: {
    postMessage: vi.fn(),
  },
  reveal: vi.fn(),
} as unknown as WebviewPanel;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(PANEL_MOCK.webview.postMessage).mockResolvedValue(true);
});

function getRoutingService(): RoutingService {
  return new RoutingService({
    panel: PANEL_MOCK,
  });
}

describe('RoutingService#openQuadletCompose', () => {
  test.each<{ filepath: string; expected: string }>([
    { filepath: '/home/user/compose.yaml', expected: '%2Fhome%2Fuser%2Fcompose.yaml' },
    { filepath: '/home/user/100%/compose.yaml', expected: '%2Fhome%2Fuser%2F100%25%2Fcompose.yaml' },
    { filepath: '/home/user/a+b c&d#e/compose.yaml', expected: '%2Fhome%2Fuser%2Fa%2Bb+c%26d%23e%2Fcompose.yaml' },
  ])('filepath $filepath should be encoded in the route', async ({ filepath, expected }) => {
    const routing = getRoutingService();
    await routing.openQuadletCompose(filepath);

    expect(routing.read()).toStrictEqual(`/quadlets/compose?filepath=${expected}`);
    expect(PANEL_MOCK.reveal).toHaveBeenCalledOnce();
  });
});
