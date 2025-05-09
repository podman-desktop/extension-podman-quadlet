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

import { test, expect } from 'vitest';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import { QuadletExtensionParser } from './quadlet-extension-parser';

test.each<QuadletType>(Object.values(QuadletType))('parsing file with extension %s', (type: QuadletType) => {
  const result = new QuadletExtensionParser(`/example/foo.${type.toLowerCase()}`).parse();
  expect(result).toStrictEqual(type);
});

test('path without extension should throw an error', () => {
  expect(() => {
    new QuadletExtensionParser(`/example/foo`).parse();
  }).toThrowError('cannot find quadlet type from path: /example/foo');
});

test('unknown extension should throw an error', () => {
  expect(() => {
    new QuadletExtensionParser(`/example/foo.txt`).parse();
  }).toThrowError('cannot find quadlet type from path: /example/foo.txt');
});
