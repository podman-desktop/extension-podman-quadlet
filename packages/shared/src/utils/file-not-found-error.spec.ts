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
import { expect, test } from 'vitest';
import { createFileNotFoundError, isFileNotFoundError } from './file-not-found-error';

test('created error should be identified as file not found', () => {
  const error = createFileNotFoundError('/foo/bar.env');
  expect(error.message).toBe('File not found: /foo/bar.env');
  expect(isFileNotFoundError(error)).toBeTruthy();
});

test('serialized error message should be identified as file not found', () => {
  expect(isFileNotFoundError(createFileNotFoundError('/foo/bar.env').message)).toBeTruthy();
});

test.each([new Error('EACCES: permission denied'), 'Something went wrong', undefined, 5])(
  '%s should not be identified as file not found',
  value => {
    expect(isFileNotFoundError(value)).toBeFalsy();
  },
);
