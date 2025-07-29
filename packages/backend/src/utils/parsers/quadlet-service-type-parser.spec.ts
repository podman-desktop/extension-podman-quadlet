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
import type { QuadletServiceTypeParserResult } from './quadlet-service-type-parser';
import { ServiceType, QuadletServiceTypeParser } from './quadlet-service-type-parser';

interface TestCase {
  name: string;
  filename: string;
  extension: string;
  expected: QuadletServiceTypeParserResult;
}

test.each<TestCase>([
  {
    expected: [ServiceType.SIMPLE, undefined],
    filename: 'foo.container',
    extension: 'container',
    name: 'simple quadlet',
  },
  {
    expected: [ServiceType.TEMPLATE, 'foo'],
    filename: 'foo@.container',
    extension: 'container',
    name: 'template quadlet',
  },
  {
    expected: [ServiceType.TEMPLATE_INSTANCE, { template: 'foo', argument: 'bar' }],
    filename: 'foo@bar.container',
    extension: 'container',
    name: 'template instance quadlet',
  },
])('$name', ({ filename, extension, expected }) => {
  const parser = new QuadletServiceTypeParser({
    filename,
    extension,
  });
  expect(parser.parse()).toStrictEqual(expected);
});

test('filename without extension should throw an error', () => {
  const parser = new QuadletServiceTypeParser({
    filename: 'potatoes',
    extension: 'service',
  });

  expect(() => {
    parser.parse();
  }).toThrowError('service potatoes does not have an extension');
});

test('filename extension not matching expected should throw an error', () => {
  const parser = new QuadletServiceTypeParser({
    filename: 'potatoes.bar',
    extension: 'service',
  });

  expect(() => {
    parser.parse();
  }).toThrowError('extension of the file potatoes.bar is not service');
});
