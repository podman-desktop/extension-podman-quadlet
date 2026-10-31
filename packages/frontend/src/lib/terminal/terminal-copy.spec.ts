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

import { beforeEach, expect, test, vi } from 'vitest';
import { copySelection, handleCopyKeyEvent } from './terminal-copy';

const writeText = vi.fn();

function terminalWith(selection: string): { getSelection: () => string } {
  return { getSelection: () => selection };
}

beforeEach(() => {
  vi.resetAllMocks();
  writeText.mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
});

test('copySelection should write selection to clipboard', async () => {
  expect(await copySelection(terminalWith('hello'))).toBe(true);
  expect(writeText).toHaveBeenCalledWith('hello');
});

test('copySelection should not touch clipboard without selection', async () => {
  expect(await copySelection(terminalWith(''))).toBe(false);
  expect(writeText).not.toHaveBeenCalled();
});

test.each([
  { ctrlKey: true, key: 'c' },
  { metaKey: true, key: 'c' },
  { ctrlKey: true, shiftKey: true, key: 'C' },
  { ctrlKey: true, key: 'Insert' },
])('%o with selection should copy and be consumed', init => {
  const event = new KeyboardEvent('keydown', { ...init, cancelable: true });
  expect(handleCopyKeyEvent(terminalWith('log line'), event)).toBe(false);
  expect(event.defaultPrevented).toBe(true);
  expect(writeText).toHaveBeenCalledWith('log line');
});

test('Ctrl+C without selection should be left to xterm', () => {
  const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'c' });
  expect(handleCopyKeyEvent(terminalWith(''), event)).toBe(true);
  expect(writeText).not.toHaveBeenCalled();
});

test('unrelated keys and keyup events are ignored', () => {
  expect(handleCopyKeyEvent(terminalWith('x'), new KeyboardEvent('keydown', { key: 'a' }))).toBe(true);
  expect(handleCopyKeyEvent(terminalWith('x'), new KeyboardEvent('keyup', { ctrlKey: true, key: 'c' }))).toBe(true);
  expect(writeText).not.toHaveBeenCalled();
});

test('copySelection should fall back to execCommand when the clipboard API fails', async () => {
  writeText.mockRejectedValue(new Error('denied'));
  const execCommand = vi.fn().mockReturnValue(true);
  Object.assign(document, { execCommand });
  const warn = vi.spyOn(console, 'warn');

  expect(await copySelection(terminalWith('hello'))).toBe(true);
  expect(execCommand).toHaveBeenCalledWith('copy');
  expect(warn).not.toHaveBeenCalled();
});

test('copySelection should log an error when both copy methods fail', async () => {
  writeText.mockRejectedValue(new Error('denied'));
  Object.assign(document, { execCommand: vi.fn().mockReturnValue(false) });
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});

  await copySelection(terminalWith('hello'));
  expect(error).toHaveBeenCalled();
});
