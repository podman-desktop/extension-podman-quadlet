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

import { beforeEach, vi, test, expect } from 'vitest';
import { ImageService } from './image-service';
import type { ProviderService } from './provider-service';
import type { containerEngine } from '@podman-desktop/api';

const PROVIDER_SERVICE_MOCK: ProviderService = {
  getContainerConnections: vi.fn(),
} as unknown as ProviderService;

const CONTAINER_ENGINE_MOCK: typeof containerEngine = {
  getImageInspect: vi.fn(),
} as unknown as typeof containerEngine;

beforeEach(() => {
  vi.resetAllMocks();
});

function getImageService(): ImageService {
  return new ImageService({
    providers: PROVIDER_SERVICE_MOCK,
    containers: CONTAINER_ENGINE_MOCK,
  });
}

test('ImageService#inspectImage should use container engine getImageInspect', async () => {
  const image = getImageService();
  await image.inspectImage('dummy-engine-id', 'dummy-image-id');

  expect(CONTAINER_ENGINE_MOCK.getImageInspect).toHaveBeenCalledWith('dummy-engine-id', 'dummy-image-id');
});
