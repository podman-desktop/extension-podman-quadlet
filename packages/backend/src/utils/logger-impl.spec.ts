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
import { expect, test, vi, beforeEach } from 'vitest';
import type { Webview } from '@podman-desktop/api';
import { CancellationTokenSource } from '@podman-desktop/api';
import { LoggerImpl } from './logger-impl';
import { Messages } from '/@shared/src/messages';

const WEBVIEW_MOCK: Webview = {
  postMessage: vi.fn(),
} as unknown as Webview;
const LOGGER_ID: string = 'dummy-logger-id';
const CANCELLATION_TOKEN_SOURCE_MOCK: CancellationTokenSource = {
  token: {
    isCancellationRequested: false,
    onCancellationRequested: vi.fn(),
  },
  cancel: vi.fn(),
  dispose: vi.fn(),
} as unknown as CancellationTokenSource;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(CancellationTokenSource).mockReturnValue(CANCELLATION_TOKEN_SOURCE_MOCK);
  vi.mocked(WEBVIEW_MOCK.postMessage).mockResolvedValue(true);
});

test('default LoggerImpl should not have any data', () => {
  const logger = new LoggerImpl({
    webview: WEBVIEW_MOCK,
    loggerId: LOGGER_ID,
  });
  expect(logger.all()).toHaveLength(0);
});

test('LoggerImpl#id should return provided loggerId', () => {
  const logger = new LoggerImpl({
    webview: WEBVIEW_MOCK,
    loggerId: LOGGER_ID,
  });
  expect(logger.id).toStrictEqual(LOGGER_ID);
});

test('LoggerImpl should create a token and return it through LoggerImpl#token', () => {
  expect(CancellationTokenSource).not.toHaveBeenCalled();

  const logger = new LoggerImpl({
    webview: WEBVIEW_MOCK,
    loggerId: LOGGER_ID,
  });

  expect(CancellationTokenSource).toHaveBeenCalledOnce();
  expect(logger.token).toStrictEqual(CANCELLATION_TOKEN_SOURCE_MOCK.token);
});

test('disposing LoggerImpl should cancel&dispose token', () => {
  expect(CANCELLATION_TOKEN_SOURCE_MOCK.cancel).not.toHaveBeenCalled();
  expect(CANCELLATION_TOKEN_SOURCE_MOCK.dispose).not.toHaveBeenCalled();

  const logger = new LoggerImpl({
    webview: WEBVIEW_MOCK,
    loggerId: LOGGER_ID,
  });
  logger.dispose();
  // ensure token is cancelled and disposed
  expect(CANCELLATION_TOKEN_SOURCE_MOCK.cancel).toHaveBeenCalledOnce();
  expect(CANCELLATION_TOKEN_SOURCE_MOCK.dispose).toHaveBeenCalledOnce();
});

test('maxLogsLengths should prevent logs to exceed given length', () => {
  const logger = new LoggerImpl({
    webview: WEBVIEW_MOCK,
    loggerId: LOGGER_ID,
    maxLogsLengths: 2,
  });
  logger.log('a');
  logger.log('b');

  expect(logger.all()).toHaveLength(2);

  logger.log('c');

  const content = logger.all();
  expect(content).toStrictEqual('bc');
});

test('log should notify webview', () => {
  const logger = new LoggerImpl({
    webview: WEBVIEW_MOCK,
    loggerId: LOGGER_ID,
    maxLogsLengths: 2,
  });
  logger.log('a');

  expect(WEBVIEW_MOCK.postMessage).toHaveBeenCalledWith({
    id: Messages.LOGGER_DATA,
    body: {
      value: 'a',
      loggerId: LOGGER_ID,
    },
  });
});
