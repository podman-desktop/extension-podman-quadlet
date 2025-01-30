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
import type { window } from '@podman-desktop/api';

import { beforeEach, vi, test, expect } from 'vitest';
import { DialogService } from './dialog-service';

beforeEach(() => {
  vi.resetAllMocks();
});

const WINDOWS_API_MOCK: typeof window = {
  showWarningMessage: vi.fn(),
} as unknown as typeof window;

test('expect DialogService#showWarningMessage to use windowApi#showWarningMessage', async () => {
  vi.mocked(WINDOWS_API_MOCK.showWarningMessage).mockResolvedValue('hello');

  const dialog = new DialogService({
    windowApi: WINDOWS_API_MOCK,
  });
  const result = await dialog.showWarningMessage('foo.bar', 'hello', 'world');
  expect(result).toStrictEqual('hello');

  expect(WINDOWS_API_MOCK.showWarningMessage).toHaveBeenCalledWith('foo.bar', 'hello', 'world');
});
