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
import type { configuration as configurationAPI, Configuration } from '@podman-desktop/api';
import { test, beforeEach, vi, expect } from 'vitest';
import {
  CONFIGURATION_SECTION,
  ConfigurationService,
  PREFERRED_CONTAINER_ENGINE_CONNECTION_KEY,
} from './configuration-service';
import type { CONTAINER_ENGINE_CONNECTION_FORMAT } from '@podman-desktop/quadlet-extension-core-api';

const CONFIGURATION_VALUE_MOCK: CONTAINER_ENGINE_CONNECTION_FORMAT = 'podman:podman-machine-default';

const CONFIGURATION_API_MOCK: typeof configurationAPI = {
  getConfiguration: vi.fn(),
  onDidChangeConfiguration: vi.fn(),
};

const CONFIGURATION_MOCK: Configuration = {
  get: vi.fn(),
  has: vi.fn(),
  update: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(CONFIGURATION_API_MOCK.getConfiguration).mockReturnValue(CONFIGURATION_MOCK);
});

test('expect getPreferredContainerEngineConnection to forward configuration#get', () => {
  vi.mocked(CONFIGURATION_MOCK.get).mockReturnValue(CONFIGURATION_VALUE_MOCK);

  const service = new ConfigurationService({
    configurationAPI: CONFIGURATION_API_MOCK,
  });

  const result = service.getPreferredContainerEngineConnection();
  expect(result).toEqual(CONFIGURATION_VALUE_MOCK);

  expect(CONFIGURATION_API_MOCK.getConfiguration).toHaveBeenCalledExactlyOnceWith(CONFIGURATION_SECTION);
  expect(CONFIGURATION_MOCK.get).toHaveBeenCalledExactlyOnceWith(PREFERRED_CONTAINER_ENGINE_CONNECTION_KEY);
});

test('expect setPreferredContainerEngineConnection to forward configuration#update', async () => {
  const service = new ConfigurationService({
    configurationAPI: CONFIGURATION_API_MOCK,
  });

  await service.setPreferredContainerEngineConnection(CONFIGURATION_VALUE_MOCK);

  expect(CONFIGURATION_API_MOCK.getConfiguration).toHaveBeenCalledExactlyOnceWith(CONFIGURATION_SECTION);
  expect(CONFIGURATION_MOCK.update).toHaveBeenCalledExactlyOnceWith(
    PREFERRED_CONTAINER_ENGINE_CONNECTION_KEY,
    CONFIGURATION_VALUE_MOCK,
  );
});
