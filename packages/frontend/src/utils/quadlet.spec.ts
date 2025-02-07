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
import { isKubeQuadlet } from '/@/utils/quadlet';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';

const PODMAN_MACHINE_DEFAULT: ProviderContainerConnectionIdentifierInfo = {
  name: 'podman-machine-default',
  providerId: 'podman',
};

test.each(Object.values(QuadletType).filter(type => type !== QuadletType.KUBE))(
  'expect %s not to be recognised as kube',
  type => {
    expect(
      isKubeQuadlet({
        type: type,
        id: `foo.bar`,
        path: `/mnt/foo/bar.${type.toLowerCase()}`,
        content: 'dummy-content',
        state: 'active',
        connection: PODMAN_MACHINE_DEFAULT,
      }),
    ).toBeFalsy();
  },
);

test(`expect ${QuadletType.KUBE} to be recognised`, () => {
  expect(
    isKubeQuadlet({
      type: QuadletType.KUBE,
      id: `foo.bar`,
      path: `/mnt/foo/bar.kube`,
      content: 'dummy-content',
      state: 'active',
      connection: PODMAN_MACHINE_DEFAULT,
    }),
  ).toBeTruthy();
});
