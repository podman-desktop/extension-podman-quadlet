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

import { beforeEach, describe, expect, test, vi } from 'vitest';
import type {
  CancellationToken,
  env,
  Progress,
  ProviderContainerConnection,
  RunResult,
  TelemetryLogger,
  Webview,
  window,
} from '@podman-desktop/api';
import { ProgressLocation } from '@podman-desktop/api';
import type { ProviderService } from './provider-service';
import type { PodmanService } from './podman-service';
import type { SystemdService } from './systemd-service';
import { QuadletService } from './quadlet-service';
import { QuadletDryRunParser } from '../utils/parsers/quadlet-dryrun-parser';
import type { Quadlet } from '../models/quadlet';
import { Messages } from '/@shared/src/messages';
import { QuadletTypeParser } from '../utils/parsers/quadlet-type-parser';
import { QuadletType } from '/@shared/src/utils/quadlet-type';

vi.mock('../utils/parsers/quadlet-dryrun-parser');
vi.mock('../utils/parsers/quadlet-type-parser');
vi.mock('@podman-desktop/api', () => ({
  ProgressLocation: {
    TASK_WIDGET: 2,
  },
}));

const WSL_RUNNING_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    name: 'podman-machine',
    vmType: 'WSL',
    status: () => 'started',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

// Mock for dependencies injection (constructor)
const PROVIDER_SERVICE_MOCK: ProviderService = {
  getContainerConnections: vi.fn(),
  getProviderContainerConnection: vi.fn(),
  toProviderContainerConnectionDetailedInfo: vi.fn(),
} as unknown as ProviderService;

const PODMAN_SERVICE_MOCK: PodmanService = {
  quadletExec: vi.fn(),
  rmFile: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
} as unknown as PodmanService;

const SYSTEMD_SERVICE_MOCK: SystemdService = {
  getSystemctlVersion: vi.fn(),
  getActiveStatus: vi.fn(),
  daemonReload: vi.fn(),
} as unknown as SystemdService;
// api object
const WINDOW_MOCK: typeof window = {
  withProgress: vi.fn(),
} as unknown as typeof window;
const ENV_MOCK: typeof env = {} as unknown as typeof env;
const TELEMETRY_LOGGER_MOCK: TelemetryLogger = {
  logUsage: vi.fn(),
} as unknown as TelemetryLogger;
const WEBVIEW_MOCK: Webview = {
  postMessage: vi.fn(),
} as unknown as Webview;

const RUN_RESULT_MOCK: RunResult = {
  stdout: 'dummy-stdout',
  command: 'foobar',
  stderr: 'dummy-stderr',
};

const QUADLET_MOCK: Quadlet = {
  id: 'foo.service',
  path: 'foo/bar',
  state: 'unknown',
  content: 'dummy-content',
  type: QuadletType.CONTAINER,
};

const PROGRESS_REPORT: Progress<{ message?: string; increment?: number }> = {
  report: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(PROVIDER_SERVICE_MOCK.getContainerConnections).mockReturnValue([WSL_RUNNING_PROVIDER_CONNECTION_MOCK]);
  vi.mocked(PROVIDER_SERVICE_MOCK.getProviderContainerConnection).mockReturnValue(WSL_RUNNING_PROVIDER_CONNECTION_MOCK);
  vi.mocked(SYSTEMD_SERVICE_MOCK.getSystemctlVersion).mockResolvedValue('systemd 255 (255.13-1.fc40)');
  vi.mocked(SYSTEMD_SERVICE_MOCK.getActiveStatus).mockResolvedValue({
    [QUADLET_MOCK.id]: true,
  });

  vi.mocked(PODMAN_SERVICE_MOCK.quadletExec).mockResolvedValue(RUN_RESULT_MOCK);
  vi.mocked(QuadletDryRunParser.prototype.parse).mockResolvedValue([QUADLET_MOCK]);
  vi.mocked(WEBVIEW_MOCK.postMessage).mockResolvedValue(true);

  vi.mocked(WINDOW_MOCK.withProgress).mockImplementation((_options, tasks): Promise<unknown> => {
    return tasks(PROGRESS_REPORT, {} as unknown as CancellationToken);
  });
});

function getQuadletService(): QuadletService {
  return new QuadletService({
    providers: PROVIDER_SERVICE_MOCK,
    env: ENV_MOCK,
    webview: WEBVIEW_MOCK,
    podman: PODMAN_SERVICE_MOCK,
    systemd: SYSTEMD_SERVICE_MOCK,
    window: WINDOW_MOCK,
    telemetry: TELEMETRY_LOGGER_MOCK,
  });
}

describe('QuadletService#collectPodmanQuadlet', () => {
  test('should use PodmanService#quadletExec to get quadlet dry-run', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    expect(PODMAN_SERVICE_MOCK.quadletExec).toHaveBeenCalledWith({
      connection: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      args: ['-dryrun', '-user'],
    });

    expect(quadlet.all()).toHaveLength(1);
  });
});

describe('QuadletService#updateIntoMachine', () => {
  test('should write using PodmanService#writeTextFile', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    await quadlet.updateIntoMachine({
      quadlet: 'dummy-content',
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      path: 'foo/bar.container',
    });

    expect(PODMAN_SERVICE_MOCK.writeTextFile).toHaveBeenCalledWith(
      WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      'foo/bar.container',
      'dummy-content',
    );

    expect(SYSTEMD_SERVICE_MOCK.daemonReload).toHaveBeenCalled();
  });
});

describe('QuadletService#saveIntoMachine', () => {
  test('should write single resource', async () => {
    // let's mock a basic CONTAINER quadlet
    vi.mocked(QuadletTypeParser.prototype.parse).mockReturnValue(QuadletType.CONTAINER);

    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    await quadlet.saveIntoMachine({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      quadlet: 'dummy-container-quadlet',
      name: 'foo',
    });
    // content provided should have been parsed
    expect(QuadletTypeParser).toHaveBeenCalledWith('dummy-container-quadlet');

    expect(PODMAN_SERVICE_MOCK.writeTextFile).toHaveBeenCalledWith(
      WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      '~/.config/containers/systemd/foo.container', // always the same (using node:path/posix)
      'dummy-container-quadlet',
    );
  });

  test.each(Object.values(QuadletType))('QuadletType %s should have corresponding extension', async quadletType => {
    vi.mocked(QuadletTypeParser.prototype.parse).mockReturnValue(quadletType);
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    await quadlet.saveIntoMachine({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      quadlet: 'dummy-container-quadlet',
      name: 'foo',
    });

    expect(PODMAN_SERVICE_MOCK.writeTextFile).toHaveBeenCalledWith(
      WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      `~/.config/containers/systemd/foo.${quadletType.toLowerCase()}`, // always the same (using node:path/posix)
      'dummy-container-quadlet',
    );
  });

  test('should parse multiple resources', async () => {
    vi.mocked(QuadletTypeParser.prototype.parse).mockReturnValue(QuadletType.CONTAINER);

    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    await quadlet.saveIntoMachine({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      quadlet: 'foo---bar',
      name: 'foo',
    });

    expect(QuadletTypeParser).toHaveBeenCalledTimes(2);
    // content provided should have been parsed
    expect(QuadletTypeParser).toHaveBeenCalledWith('foo');
    expect(QuadletTypeParser).toHaveBeenCalledWith('bar');
  });

  test('should try parsing YAML if QuadletTypeParser raise an error', async () => {
    vi.mocked(QuadletTypeParser.prototype.parse).mockReturnValueOnce(QuadletType.KUBE);
    vi.mocked(QuadletTypeParser.prototype.parse).mockRejectedValue('dummy error');

    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    await quadlet.saveIntoMachine({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      quadlet: 'foo---foo: bar',
      name: 'foo',
    });

    expect(QuadletTypeParser).toHaveBeenCalledTimes(2);
    // expect kube quadlet to be created
    expect(PODMAN_SERVICE_MOCK.writeTextFile).toHaveBeenCalledWith(
      WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      `~/.config/containers/systemd/foo.kube`, // always the same (using node:path/posix)
      'foo',
    );

    // expect yaml file to be created
    expect(PODMAN_SERVICE_MOCK.writeTextFile).toHaveBeenCalledWith(
      WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      `~/.config/containers/systemd/foo-kube.yaml`, // always the same (using node:path/posix)
      'foo: bar',
    );
  });
});

describe('QuadletService#refreshQuadletsStatuses', () => {
  test('should use result from SystemdService#getActiveStatus', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    expect(quadlet.all()[0].state).toStrictEqual('active');

    vi.mocked(SYSTEMD_SERVICE_MOCK.getActiveStatus).mockResolvedValue({
      [QUADLET_MOCK.id]: false,
    });

    await quadlet.refreshQuadletsStatuses();

    expect(quadlet.all()[0].state).toStrictEqual('inactive');
  });
});

describe('QuadletService#remove', () => {
  const QUADLETS_MOCK: Quadlet[] = Array.from({ length: 10 }, (_, index) => ({
    id: `quadlet-${index}.container`,
    state: 'unknown',
    path: `config/quadlet-${index}.container`,
    content: 'dummy-content',
    type: QuadletType.CONTAINER,
  }));

  beforeEach(() => {
    vi.mocked(QuadletDryRunParser.prototype.parse).mockResolvedValue(QUADLETS_MOCK);
  });

  test('removing ONE quadlet should use its name in the task created', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    await quadlet.remove({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      ids: [QUADLETS_MOCK[0].id],
    });

    // task should be created with appropriate title
    expect(WINDOW_MOCK.withProgress).toHaveBeenCalledWith(
      {
        location: ProgressLocation.TASK_WIDGET,
        title: `Removing quadlet ${QUADLETS_MOCK[0].id}`,
      },
      expect.any(Function),
    );

    // last call should properly set final message
    expect(PROGRESS_REPORT.report).toHaveBeenLastCalledWith({
      message: `Removed quadlet ${QUADLETS_MOCK[0].id}.`,
    });
  });

  test('removing MULTIPLE quadlets should have appropriate task title', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    await quadlet.remove({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      ids: QUADLETS_MOCK.map(({ id }): string => id),
    });

    // task should be created with appropriate title
    expect(WINDOW_MOCK.withProgress).toHaveBeenCalledWith(
      {
        location: ProgressLocation.TASK_WIDGET,
        title: `Removing ${QUADLETS_MOCK.length} quadlets`,
      },
      expect.any(Function),
    );

    // last call should properly set final message
    expect(PROGRESS_REPORT.report).toHaveBeenLastCalledWith({
      message: `Removed ${QUADLETS_MOCK.length} quadlets.`,
    });
  });

  test('should update the state to deleting before removing it.', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    await quadlet.remove({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      ids: [QUADLETS_MOCK[0].id],
    });

    // 1. should have notified while deleting
    expect(WEBVIEW_MOCK.postMessage).toHaveBeenCalledWith({
      id: Messages.UPDATE_QUADLETS,
      body: expect.arrayContaining([
        expect.objectContaining({
          state: 'deleting',
          id: QUADLETS_MOCK[0].id,
        }),
      ]),
    });

    // 2. should have notified after deletion
    expect(WEBVIEW_MOCK.postMessage).toHaveBeenCalledWith({
      id: Messages.UPDATE_QUADLETS,
      body: expect.not.arrayContaining([
        expect.objectContaining({
          id: QUADLETS_MOCK[0].id,
        }),
      ]),
    });

    // Removed
    expect(quadlet.all()).toHaveLength(9);
  });

  test('remove all should properly removed all', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    await quadlet.remove({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      ids: QUADLETS_MOCK.map(({ id }): string => id),
    });

    // Removed
    expect(quadlet.all()).toHaveLength(0);
  });

  test('error should be propagated', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    await expect(() => {
      return quadlet.remove({
        provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
        ids: ['invalid-id'],
      });
    }).rejects.toThrowError('cannot found quadlet with id invalid-id and provider podman:podman-machine');
  });

  test('error should trigger a QuadletService#collectPodmanQuadlet', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    // reset mock to reset call count
    vi.mocked(PODMAN_SERVICE_MOCK.quadletExec).mockReset();
    expect(PODMAN_SERVICE_MOCK.quadletExec).not.toHaveBeenCalled(); // ensure reset worked

    await expect(() => {
      return quadlet.remove({
        provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
        ids: ['invalid-id'],
      });
    }).rejects.toThrowError();

    expect(PODMAN_SERVICE_MOCK.quadletExec).toHaveBeenCalledOnce();
  });
});

describe('QuadletService#read', () => {
  test('should use Podman#readTextFile', async () => {
    vi.mocked(PODMAN_SERVICE_MOCK.readTextFile).mockResolvedValue('fake-content');
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    const result = await quadlet.read({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      id: QUADLET_MOCK.id,
    });
    expect(result).toStrictEqual('fake-content');

    expect(PODMAN_SERVICE_MOCK.readTextFile).toHaveBeenCalledWith(
      WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      QUADLET_MOCK.path,
    );
  });
});

describe('QuadletService#getSynchronisationInfo', () => {
  test('should contain provider synchronisation', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    const sync = quadlet.getSynchronisationInfo();
    expect(sync).toHaveLength(1);
  });
});
