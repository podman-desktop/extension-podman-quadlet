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
import { beforeEach, expect, test, vi } from 'vitest';
import { Publisher } from './publisher';
import type { Webview } from '@podman-desktop/api';
import { Messages } from '/@shared/src/messages';

const WEBVIEW_MOCK: Webview = {
  postMessage: vi.fn(),
} as unknown as Webview;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(WEBVIEW_MOCK.postMessage).mockResolvedValue(true);
});

test('ensure publisher properly use getter', async () => {
  const getterMock = vi.fn().mockReturnValue('dummyValue');
  const publisher = new Publisher<string>(WEBVIEW_MOCK, Messages.TEST_PURPOSE, getterMock);
  publisher.notify();

  await vi.waitFor(() => {
    expect(WEBVIEW_MOCK.postMessage).toHaveBeenCalledWith({
      id: Messages.TEST_PURPOSE,
      body: 'dummyValue',
    });
  });
  expect(getterMock).toHaveBeenCalled();
});

test('publisher should notify all listeners', async () => {
  const getterMock = vi.fn().mockReturnValue('dummyValue');
  const publisher = new Publisher<string>(WEBVIEW_MOCK, Messages.TEST_PURPOSE, getterMock);

  const listeners = Array.from({ length: 10 }).map(() => vi.fn());
  listeners.forEach(listener => publisher.event(listener));

  publisher.notify();

  await vi.waitFor(() => {
    listeners.forEach(listener => {
      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith('dummyValue');
    });
  });
});
