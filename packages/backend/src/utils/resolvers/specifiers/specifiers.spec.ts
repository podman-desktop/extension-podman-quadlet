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
import type { PodmanWorker } from '/@/utils/worker/podman-worker';
import { Specifiers } from '/@/utils/resolvers/specifiers/specifiers';
import type { SpecifierResolver } from '/@/utils/resolvers/specifiers/specifier-resolver';

const PODMAN_WORKER_MOCK: PodmanWorker = {} as unknown as PodmanWorker;

test.each<[string, new (worker: PodmanWorker) => SpecifierResolver]>(Object.entries(Specifiers))(
  'specifier %s should match instance key',
  (specifier, newable) => {
    const instance = new newable(PODMAN_WORKER_MOCK);
    expect(instance.key).toEqual(specifier);
  },
);
