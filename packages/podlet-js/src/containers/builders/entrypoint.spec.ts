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
import { Entrypoint } from './entrypoint';
import type { ContainerInspectInfo, ImageInspectInfo } from '@podman-desktop/api';

interface TestCase {
  name: string;
  entrypoint: {
    container: string | Array<string> | undefined;
    image: string | Array<string> | undefined;
  };
  expected: string | undefined;
}

test.each<TestCase>([
  {
    name: 'simple container defined string entrypoint',
    entrypoint: {
      container: '/bin/bash',
      image: undefined,
    },
    expected: '/bin/bash',
  },
  {
    name: 'simple default entrypoint',
    entrypoint: {
      container: '/bin/bash',
      image: '/bin/bash',
    },
    expected: undefined,
  },
  {
    name: 'array container defined entrypoint',
    entrypoint: {
      container: ['/bin/bash', '-c'],
      image: '/bin/bash',
    },
    expected: '/bin/bash -c',
  },
  {
    name: 'empty string entrypoint should be ignored',
    entrypoint: {
      container: '',
      image: undefined,
    },
    expected: undefined,
  },
  {
    name: 'empty array entrypoint should be ignored',
    entrypoint: {
      container: [],
      image: undefined,
    },
    expected: undefined,
  },
])('$name', ({ entrypoint, expected }) => {
  const builder = new Entrypoint({
    container: {
      Config: {
        Entrypoint: entrypoint.container,
      },
    } as unknown as ContainerInspectInfo,
    image: {
      Config: {
        Entrypoint: entrypoint.image,
      },
    } as unknown as ImageInspectInfo,
  });

  const { Container } = builder.build({ Container: {} });
  expect(Container.Entrypoint).toStrictEqual(expected);
});
