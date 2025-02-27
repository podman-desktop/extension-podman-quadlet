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

import { expect, test } from 'vitest';
import { ContainerQuadletBuilder } from './container-quadlet-builder';
import type { ContainerQuadlet } from '../../models/container-quadlet';
import type { ContainerInspectInfo, ImageInspectInfo } from '@podman-desktop/api';

class ContainerQuadletBuilderTest extends ContainerQuadletBuilder {
  constructor() {
    super({
      image: {} as ImageInspectInfo,
      container: {} as ContainerInspectInfo,
    });
  }

  public override toMap<T>(record: Record<string, T>): Map<string, T> {
    return super.toMap(record);
  }

  public override arraysEqual(a: unknown, b: unknown): boolean {
    return super.arraysEqual(a, b);
  }

  override build(_from: ContainerQuadlet): ContainerQuadlet {
    throw new Error('Method not implemented.');
  }
}

test.each<{
  expected: boolean;
  a: unknown;
  b: unknown;
}>([
  {
    expected: true,
    a: [],
    b: [],
  },
  {
    expected: true,
    a: ['hello'],
    b: ['hello'],
  },
  {
    expected: false,
    a: ['hello'],
    b: ['world'],
  },
  {
    expected: false,
    a: ['hello'],
    b: [],
  },
  {
    expected: false,
    a: [],
    b: ['world'],
  },
  {
    expected: false,
    a: [5],
    b: ['5'],
  },
  {
    expected: false,
    a: [1, 2],
    b: [1, 2, 3],
  },
  {
    expected: false,
    a: true,
    b: [1, 2, 3],
  },
  {
    expected: false,
    a: undefined,
    b: [1, 2, 3],
  },
])('arraysEqual($a, $b) -> $expected', ({ a, b, expected }) => {
  const utils = new ContainerQuadletBuilderTest();
  expect(utils.arraysEqual(a, b)).toBe(expected);
  // checking the other way arround
  // eslint-disable-next-line sonarjs/arguments-order
  expect(utils.arraysEqual(b, a)).toBe(expected);
});
