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
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { QuadletApiImpl } from './quadlet-api-impl';
import type { QuadletService } from '../services/quadlet-service';
import type { SystemdService } from '../services/systemd-service';
import type { PodmanService } from '../services/podman-service';
import type { ProviderService } from '../services/provider-service';
import type { LoggerService } from '../services/logger-service';
import type { ProviderContainerConnection, RunResult } from '@podman-desktop/api';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import type { LoggerImpl } from '../utils/logger-impl';
import type { PodmanWorker } from '../utils/worker/podman-worker';
import type { ServiceQuadlet } from '/@shared/src/models/service-quadlet';
import type { TemplateQuadlet } from '/@shared/src/models/template-quadlet';

const QUADLET_SERVICE: QuadletService = {
  readIntoMachine: vi.fn(),
  getQuadlet: vi.fn(),
  refreshQuadletsStatuses: vi.fn(),
} as unknown as QuadletService;
const SYSTEMD_SERVICE: SystemdService = {
  start: vi.fn(),
  stop: vi.fn(),
  restart: vi.fn(),
} as unknown as SystemdService;
const PODMAN_SERVICE: PodmanService = {
  getWorker: vi.fn(),
} as unknown as PodmanService;
const PROVIDER_SERVICE: ProviderService = {
  getProviderContainerConnection: vi.fn(),
} as unknown as ProviderService;
const LOGGER_SERVICE: LoggerService = {
  createLogger: vi.fn(),
} as unknown as LoggerService;
const PODMAN_WORKER_MOCK: PodmanWorker = {
  journalctlExec: vi.fn(),
} as unknown as PodmanWorker;

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

const QUADLET_MOCK: ServiceQuadlet = {
  id: 'foo-id',
  service: 'foo.service',
  path: 'foo/bar.container',
  state: 'unknown',
  content: 'dummy-content',
  type: QuadletType.CONTAINER,
  requires: [],
  files: [],
};

const TEMPLATE_QUADLET_MOCK: TemplateQuadlet & ServiceQuadlet = {
  id: 'foo-template-id',
  service: 'foo@.service',
  path: '/foo@.container',
  state: 'unknown',
  content: 'dummy-content',
  type: QuadletType.CONTAINER,
  requires: [],
  files: [],
  template: 'foo',
  defaultInstance: undefined, // no default instance
};

const STARTABLE_TEMPLATE_QUADLET_MOCK: TemplateQuadlet & ServiceQuadlet = {
  ...TEMPLATE_QUADLET_MOCK,
  service: 'foo@bar.service',
  path: '/foo@bar.container',
  defaultInstance: 'bar', // default instance provided
};

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(PODMAN_SERVICE.getWorker).mockResolvedValue(PODMAN_WORKER_MOCK);
  vi.mocked(PROVIDER_SERVICE.getProviderContainerConnection).mockReturnValue(WSL_PROVIDER_CONNECTION_MOCK);
  vi.mocked(QUADLET_SERVICE.getQuadlet).mockReturnValue(QUADLET_MOCK);
  vi.mocked(QUADLET_SERVICE.refreshQuadletsStatuses).mockResolvedValue(undefined);
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

describe('QuadletApiImpl#readIntoMachine', () => {
  test('should use QuadletService#readIntoMachine with correct arguments', async () => {
    vi.mocked(QUADLET_SERVICE.readIntoMachine).mockResolvedValue('foo: bar');

    const api = getQuadletApiImpl();
    const result = await api.readIntoMachine({
      path: '/foo/bar.yaml',
      connection: WSL_PROVIDER_IDENTIFIER,
    });

    expect(PROVIDER_SERVICE.getProviderContainerConnection).toHaveBeenCalledWith(WSL_PROVIDER_IDENTIFIER);
    expect(result).toEqual('foo: bar');

    expect(QUADLET_SERVICE.readIntoMachine).toHaveBeenCalledExactlyOnceWith({
      path: '/foo/bar.yaml',
      provider: WSL_PROVIDER_CONNECTION_MOCK,
    });
  });
});

describe.each(['start', 'stop', 'restart'] as Array<'start' | 'stop' | 'restart'>)('QuadletApiImpl#%s', func => {
  test('should ensure quadlet exists', async () => {
    const api = getQuadletApiImpl();

    await api[func](WSL_PROVIDER_IDENTIFIER, QUADLET_MOCK.id);
    expect(QUADLET_SERVICE.getQuadlet).toHaveBeenCalledWith(QUADLET_MOCK.id);
  });

  test('calling with a template quadlet should throw an error', async () => {
    vi.mocked(QUADLET_SERVICE.getQuadlet).mockReturnValue(TEMPLATE_QUADLET_MOCK);

    const api = getQuadletApiImpl();

    await expect(() => {
      return api[func](WSL_PROVIDER_IDENTIFIER, TEMPLATE_QUADLET_MOCK.id);
    }).rejects.toThrowError(`cannot ${func} quadlet: quadlet with id ${TEMPLATE_QUADLET_MOCK.id} is a template`);
  });

  test('calling with a startable template should work', async () => {
    vi.mocked(QUADLET_SERVICE.getQuadlet).mockReturnValue(STARTABLE_TEMPLATE_QUADLET_MOCK);

    const api = getQuadletApiImpl();

    await api[func](WSL_PROVIDER_IDENTIFIER, STARTABLE_TEMPLATE_QUADLET_MOCK.id);

    expect(SYSTEMD_SERVICE[func]).toHaveBeenCalledWith({
      provider: WSL_PROVIDER_CONNECTION_MOCK,
      service: STARTABLE_TEMPLATE_QUADLET_MOCK.service,
      admin: false,
    });
  });

  test('should propagate error if quadlet does not have associated service', async () => {
    vi.mocked(QUADLET_SERVICE.getQuadlet).mockReturnValue({
      ...QUADLET_MOCK,
      service: undefined,
    });

    const api = getQuadletApiImpl();

    await expect(() => {
      return api[func](WSL_PROVIDER_IDENTIFIER, QUADLET_MOCK.id);
    }).rejects.toThrowError(
      `cannot ${func} quadlet: quadlet with id ${QUADLET_MOCK.id} does not have an associated systemd service`,
    );
  });

  test('should call systemd#start with appropriate arguments', async () => {
    const api = getQuadletApiImpl();

    await api[func](WSL_PROVIDER_IDENTIFIER, QUADLET_MOCK.id);

    expect(SYSTEMD_SERVICE[func]).toHaveBeenCalledWith({
      provider: WSL_PROVIDER_CONNECTION_MOCK,
      service: QUADLET_MOCK.service,
      admin: false,
    });
  });
});

describe('QuadletApiImpl#createQuadletLogger', () => {
  const LOGGER_MOCK: LoggerImpl = {
    id: 'dummy-logger-id',
    token: 'cancellation-token',
  } as unknown as LoggerImpl;

  beforeEach(() => {
    vi.mocked(LOGGER_SERVICE.createLogger).mockReturnValue(LOGGER_MOCK);
    vi.mocked(PODMAN_WORKER_MOCK.journalctlExec).mockResolvedValue({} as RunResult);
  });

  test('should return logger created throw LoggerService#createLogger', async () => {
    const api = getQuadletApiImpl();

    const loggerId = await api.createQuadletLogger({
      connection: WSL_PROVIDER_IDENTIFIER,
      quadletId: QUADLET_MOCK.id,
    });
    expect(loggerId).toStrictEqual(LOGGER_MOCK.id);
  });

  test('calling with a template quadlet should throw an error', async () => {
    vi.mocked(QUADLET_SERVICE.getQuadlet).mockReturnValue(TEMPLATE_QUADLET_MOCK);

    const api = getQuadletApiImpl();

    await expect(() => {
      return api.createQuadletLogger({
        connection: WSL_PROVIDER_IDENTIFIER,
        quadletId: TEMPLATE_QUADLET_MOCK.id,
      });
    }).rejects.toThrowError(`cannot create quadlet logger: quadlet with id ${TEMPLATE_QUADLET_MOCK.id} is a template`);
  });

  test('should call podman#journalctlExec with appropriate arguments', async () => {
    const api = getQuadletApiImpl();

    await api.createQuadletLogger({
      connection: WSL_PROVIDER_IDENTIFIER,
      quadletId: QUADLET_MOCK.id,
    });

    expect(PODMAN_SERVICE.getWorker).toHaveBeenCalledExactlyOnceWith(WSL_PROVIDER_CONNECTION_MOCK);

    expect(PODMAN_WORKER_MOCK.journalctlExec).toHaveBeenCalledWith({
      args: ['--user', '--follow', `--unit=${QUADLET_MOCK.service}`, '--output=cat'],
      logger: LOGGER_MOCK,
      token: expect.anything(),
      env: {
        SYSTEMD_COLORS: 'true',
      },
    });
  });
});
