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
import { DialogApiImpl } from './dialog-api-impl';
import type { DialogService } from '../services/dialog-service';

const DIALOG_SERVICE_MOCK: DialogService = {
  showWarningMessage: vi.fn(),
} as unknown as DialogService;

beforeEach(() => {
  vi.resetAllMocks();
});

test('expect result to be properly propagated from DialogService', async () => {
  vi.mocked(DIALOG_SERVICE_MOCK.showWarningMessage).mockResolvedValue('No');
  const dialog = new DialogApiImpl({
    dialog: DIALOG_SERVICE_MOCK,
  });
  const result = await dialog.showWarningMessage('Are you sure?', 'Yes', 'No');
  expect(result).toStrictEqual('No');
});

test('expect error to be propagated', async () => {
  vi.mocked(DIALOG_SERVICE_MOCK.showWarningMessage).mockRejectedValue(new Error('Something went wrong'));
  const dialog = new DialogApiImpl({
    dialog: DIALOG_SERVICE_MOCK,
  });

  await expect(() => {
    return dialog.showWarningMessage('Are you sure?', 'Yes', 'No');
  }).rejects.toThrowError('Something went wrong');
});
