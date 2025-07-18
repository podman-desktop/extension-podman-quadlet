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
import { ServiceType, QuadletServiceTypeParser } from './quadlet-service-type-parser';

interface TestCase {
  name: string;
  filename: string;
  extension: string;
  expected: ServiceType;
}

test.each<TestCase>([
  {
    expected: ServiceType.SIMPLE,
    filename: 'foo.container',
    extension: 'container',
    name: 'simple quadlet',
  },
  {
    expected: ServiceType.TEMPLATE,
    filename: 'foo@.container',
    extension: 'container',
    name: 'template quadlet',
  },
  {
    expected: ServiceType.TEMPLATE_INSTANCE,
    filename: 'foo@bar.container',
    extension: 'container',
    name: 'template instance quadlet',
  },
])('$name', ({ filename, extension, expected }) => {
  const parser = new QuadletServiceTypeParser({
    filename,
    extension,
  });
  expect(parser.parse()).toEqual(expected);
});
