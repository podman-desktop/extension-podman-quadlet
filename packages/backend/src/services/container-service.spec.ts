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
import { ContainerService } from './container-service';
import type { ProviderService } from './provider-service';
import type { containerEngine, ContainerEngineInfo, ProviderContainerConnection } from '@podman-desktop/api';

const PROVIDER_SERVICE_MOCK: ProviderService = {
  getContainerConnections: vi.fn(),
} as unknown as ProviderService;

const CONTAINER_ENGINE_MOCK: typeof containerEngine = {
  listInfos: vi.fn(),
  inspectContainer: vi.fn(),
} as unknown as typeof containerEngine;

const WSL_RUNNING_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    name: 'podman-machine',
    vmType: 'WSL',
    status: () => 'started',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const WSL_STOPPED_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    name: 'podman-machine-stopped',
    vmType: 'WSL',
    status: () => 'stopped',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const DUMMY_CONTAINER_ENGINE_INFO: ContainerEngineInfo = {
  engineId: 'dummy-engine-id',
  engineName: 'Dummy Engine ID',
} as unknown as ContainerEngineInfo;

beforeEach(() => {
  vi.resetAllMocks();
});

test('getRunningProviderContainerConnectionByEngineId should skip non-started provider', async () => {
  vi.mocked(PROVIDER_SERVICE_MOCK.getContainerConnections).mockReturnValue([
    WSL_STOPPED_PROVIDER_CONNECTION_MOCK,
    WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
  ]);
  vi.mocked(CONTAINER_ENGINE_MOCK.listInfos).mockResolvedValue([DUMMY_CONTAINER_ENGINE_INFO]);

  const container = new ContainerService({
    providers: PROVIDER_SERVICE_MOCK,
    containers: CONTAINER_ENGINE_MOCK,
  });

  const connection = await container.getRunningProviderContainerConnectionByEngineId(
    DUMMY_CONTAINER_ENGINE_INFO.engineId,
  );
  expect(CONTAINER_ENGINE_MOCK.listInfos).toHaveBeenCalledOnce(); // should have been called only once
  expect(connection).toBe(WSL_RUNNING_PROVIDER_CONNECTION_MOCK);
});

test('getRunningProviderContainerConnectionByEngineId should throw an error if no running provider', async () => {
  vi.mocked(PROVIDER_SERVICE_MOCK.getContainerConnections).mockReturnValue([WSL_STOPPED_PROVIDER_CONNECTION_MOCK]);

  const container = new ContainerService({
    providers: PROVIDER_SERVICE_MOCK,
    containers: CONTAINER_ENGINE_MOCK,
  });

  await expect(async () => {
    await container.getRunningProviderContainerConnectionByEngineId('dummy engine id');
  }).rejects.toThrowError('connection not found');
  expect(CONTAINER_ENGINE_MOCK.listInfos).not.toHaveBeenCalled();
});

test('ContainerService#inspectContainer should use api inspectContainer', async () => {
  const container = new ContainerService({
    providers: PROVIDER_SERVICE_MOCK,
    containers: CONTAINER_ENGINE_MOCK,
  });

  await container.inspectContainer('dummy-engine-id', 'dummy-container-id');
  expect(CONTAINER_ENGINE_MOCK.inspectContainer).toHaveBeenCalledWith('dummy-engine-id', 'dummy-container-id');
});
