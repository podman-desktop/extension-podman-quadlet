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
import { expect, test, vi, beforeEach } from 'vitest';
import { QuadletApiImpl } from './quadlet-api-impl';
import type { QuadletService } from '../services/quadlet-service';
import type { SystemdService } from '../services/systemd-service';
import type { PodmanService } from '../services/podman-service';
import type { ProviderService } from '../services/provider-service';
import type { LoggerService } from '../services/logger-service';
import type { ProviderContainerConnection } from '@podman-desktop/api';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';

const QUADLET_SERVICE: QuadletService = {
  getKubeYAML: vi.fn(),
} as unknown as QuadletService;
const SYSTEMD_SERVICE: SystemdService = {} as unknown as SystemdService;
const PODMAN_SERVICE: PodmanService = {} as unknown as PodmanService;
const PROVIDER_SERVICE: ProviderService = {
  getProviderContainerConnection: vi.fn(),
} as unknown as ProviderService;
const LOGGER_SERVICE: LoggerService = {} as unknown as LoggerService;

const WSL_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    vmType: 'WSL',
    name: 'podman-machine-default',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const WSL_PROVIDER_IDENTIFIER: ProviderContainerConnectionIdentifierInfo = {
  name: WSL_PROVIDER_CONNECTION_MOCK.connection.name,
  providerId: WSL_PROVIDER_CONNECTION_MOCK.providerId,
};

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(PROVIDER_SERVICE.getProviderContainerConnection).mockReturnValue(WSL_PROVIDER_CONNECTION_MOCK);
});

function getQuadletApiImpl(): QuadletApiImpl {
  return new QuadletApiImpl({
    quadlet: QUADLET_SERVICE,
    systemd: SYSTEMD_SERVICE,
    podman: PODMAN_SERVICE,
    providers: PROVIDER_SERVICE,
    loggerService: LOGGER_SERVICE,
  });
}

test('QuadletApiImpl#getKubeYAML should propagate result from QuadletService#getKubeYAML', async () => {
  vi.mocked(QUADLET_SERVICE.getKubeYAML).mockResolvedValue('dummy-yaml-content');

  const api = getQuadletApiImpl();

  const result = await api.getKubeYAML(WSL_PROVIDER_IDENTIFIER, 'dummy-quadlet-id');
  expect(result).toStrictEqual('dummy-yaml-content');
  expect(PROVIDER_SERVICE.getProviderContainerConnection).toHaveBeenCalledWith(WSL_PROVIDER_IDENTIFIER);
});
