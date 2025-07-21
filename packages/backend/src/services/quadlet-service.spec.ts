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
  RunError,
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
import type { Quadlet } from '/@shared/src/models/quadlet';
import { Messages } from '/@shared/src/messages';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import type { PodmanWorker } from '../utils/worker/podman-worker';
import { join as joinposix } from 'node:path/posix';

vi.mock('../utils/parsers/quadlet-dryrun-parser');
vi.mock('../utils/parsers/quadlet-type-parser');

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
  getWorker: vi.fn(),
} as unknown as PodmanService;

const PODMAN_WORKER_MOCK: PodmanWorker = {
  read: vi.fn(),
  rm: vi.fn(),
  write: vi.fn(),
  exec: vi.fn(),
  systemctlExec: vi.fn(),
  quadletExec: vi.fn(),
} as unknown as PodmanWorker;

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

const QUADLET_MOCK: Quadlet & { service: string } = {
  id: 'foo-id',
  service: 'foo.service',
  path: 'foo/valid.container',
  state: 'unknown',
  content: 'dummy-content',
  type: QuadletType.CONTAINER,
  requires: [],
};

const KUBE_QUADLET_MOCK: Quadlet & { service: string } = {
  id: 'foo-kube-id',
  service: 'foo.service',
  path: 'foo/valid.kube',
  state: 'unknown',
  content: 'dummy-content',
  type: QuadletType.KUBE,
  requires: [],
};

const SERVICE_LESS_QUADLET_MOCK: Quadlet = {
  id: 'service-less-id',
  path: 'foo/invalid.container',
  state: 'unknown',
  content: 'dummy-content',
  type: QuadletType.CONTAINER,
  requires: [],
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
    [QUADLET_MOCK.service]: true,
  });

  vi.mocked(PODMAN_SERVICE_MOCK.getWorker).mockResolvedValue(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.quadletExec).mockResolvedValue(RUN_RESULT_MOCK);
  vi.mocked(QuadletDryRunParser.prototype.parse).mockResolvedValue([
    QUADLET_MOCK,
    SERVICE_LESS_QUADLET_MOCK,
    KUBE_QUADLET_MOCK,
  ]);
  vi.mocked(WEBVIEW_MOCK.postMessage).mockResolvedValue(true);

  vi.mocked(WINDOW_MOCK.withProgress).mockImplementation((_options, tasks): Promise<unknown> => {
    return tasks(PROGRESS_REPORT, {} as unknown as CancellationToken);
  });
});

class QuadletServiceTest extends QuadletService {
  public override async getQuadletVersion(provider: ProviderContainerConnection): Promise<string> {
    return super.getQuadletVersion(provider);
  }
}

function getQuadletService(): QuadletServiceTest {
  return new QuadletServiceTest({
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

    expect(PODMAN_SERVICE_MOCK.getWorker).toHaveBeenCalledWith(WSL_RUNNING_PROVIDER_CONNECTION_MOCK);

    expect(PODMAN_WORKER_MOCK.quadletExec).toHaveBeenCalledWith({
      args: ['-dryrun', '-user'],
    });

    expect(quadlet.all()).toHaveLength(3);
  });
});

describe('QuadletService#getQuadletVersion', () => {
  const VERSION_RUN_RESULT: RunResult = {
    stdout: '5.3.2',
    command: '/usr/libexec/podman/quadlet -version',
    stderr: '',
  };

  const VERSION_RUN_ERROR: RunError = {
    stdout: '5.3.2',
    command: '/usr/libexec/podman/quadlet -version',
    stderr: 'stderr content',
    exitCode: 1,
    name: 'error',
    message: 'error',
    killed: false,
    cancelled: false,
  };

  test('should use PodmanService#quadletExec to get quadlet version', async () => {
    vi.mocked(PODMAN_WORKER_MOCK.quadletExec).mockResolvedValue(VERSION_RUN_RESULT);

    const quadlet = getQuadletService();
    const result = await quadlet.getQuadletVersion(WSL_RUNNING_PROVIDER_CONNECTION_MOCK);

    // should return stdout
    expect(result).toBe('5.3.2');

    expect(PODMAN_SERVICE_MOCK.getWorker).toHaveBeenCalledWith(WSL_RUNNING_PROVIDER_CONNECTION_MOCK);

    expect(PODMAN_WORKER_MOCK.quadletExec).toHaveBeenCalledWith({
      args: ['-version'],
    });
  });

  test('PodmanService#quadletExec resolving RunError should throw an error', async () => {
    vi.mocked(PODMAN_WORKER_MOCK.quadletExec).mockResolvedValue(VERSION_RUN_ERROR);

    const quadlet = getQuadletService();

    await expect(() => {
      return quadlet.getQuadletVersion(WSL_RUNNING_PROVIDER_CONNECTION_MOCK);
    }).rejects.toThrowError('cannot get quadlet version (1): stderr content');
  });
});

describe('QuadletService#refreshQuadletsStatuses', () => {
  test('should only provide quadlet with corresponding service', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    // should have been called only with the quadlet with a corresponding service
    expect(SYSTEMD_SERVICE_MOCK.getActiveStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        services: [QUADLET_MOCK.service, KUBE_QUADLET_MOCK.service],
      }),
    );
  });

  test('should use result from SystemdService#getActiveStatus', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    expect(quadlet.all()[0].state).toStrictEqual('active');

    // mock status of quadlet inactive
    vi.mocked(SYSTEMD_SERVICE_MOCK.getActiveStatus).mockResolvedValue({
      [QUADLET_MOCK.service]: false,
    });
    await quadlet.refreshQuadletsStatuses();

    const quadlets = quadlet.all();

    const validQuadlet = quadlets.find(quadlet => quadlet.path === QUADLET_MOCK.path);
    const serviceLessQuadlet = quadlets.find(quadlet => quadlet.path === SERVICE_LESS_QUADLET_MOCK.path);

    // should update known service
    expect(validQuadlet?.state).toStrictEqual('inactive');
    // should not update service
    expect(serviceLessQuadlet?.state).toStrictEqual('unknown');
  });
});

describe('QuadletService#remove', () => {
  const QUADLETS_MOCK: Quadlet[] = Array.from({ length: 10 }, (_, index) => ({
    id: `quadlet-${index}.container`,
    state: 'unknown',
    path: `config/quadlet-${index}.container`,
    content: 'dummy-content',
    type: QuadletType.CONTAINER,
    requires: [],
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
    vi.mocked(PODMAN_WORKER_MOCK.quadletExec).mockReset();
    expect(PODMAN_WORKER_MOCK.quadletExec).not.toHaveBeenCalled(); // ensure reset worked

    await expect(() => {
      return quadlet.remove({
        provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
        ids: ['invalid-id'],
      });
    }).rejects.toThrowError();

    expect(PODMAN_WORKER_MOCK.quadletExec).toHaveBeenCalledOnce();
  });
});

describe('QuadletService#read', () => {
  test('should use Podman#readTextFile', async () => {
    vi.mocked(PODMAN_WORKER_MOCK.read).mockResolvedValue('fake-content');
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    const result = await quadlet.read({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      id: QUADLET_MOCK.id,
    });
    expect(result).toStrictEqual('fake-content');

    // ensure we get the worker with appropriate connection
    expect(PODMAN_SERVICE_MOCK.getWorker).toHaveBeenCalledWith(WSL_RUNNING_PROVIDER_CONNECTION_MOCK);

    expect(PODMAN_WORKER_MOCK.read).toHaveBeenCalledWith(QUADLET_MOCK.path);
  });
});

describe('QuadletService#getKubeYAML', () => {
  let quadlet: QuadletService;
  beforeEach(async () => {
    quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();
  });

  test('should throw an error for unknown id', async () => {
    await expect(() => {
      return quadlet.getKubeYAML({
        id: 'invalid-id',
        provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      });
    }).rejects.toThrowError('quadlet with id invalid-id not found');
  });

  test('quadlet with non-kube type should throw an error', async () => {
    await expect(() => {
      return quadlet.getKubeYAML({
        id: QUADLET_MOCK.id,
        provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      });
    }).rejects.toThrowError('cannot get kube yaml of non-kube quadlet: quadlet foo-id type is Container');
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

describe('QuadletService#getQuadlet', () => {
  test('should throw an error for unknown id', async () => {
    const quadlet = getQuadletService();
    expect(() => {
      quadlet.getQuadlet('invalid-id');
    }).toThrowError('cannot found quadlet with id invalid-id');
  });

  test('should contain provider synchronisation', async () => {
    const quadlet = getQuadletService();
    await quadlet.collectPodmanQuadlet();

    const quadlets = quadlet.all();
    for (const item of quadlets) {
      const result = quadlet.getQuadlet(item.id);
      expect(result).toBeDefined();
      expect(result.id).toStrictEqual(item.id);
    }
  });
});

describe('QuadletService#templates', () => {
  test('templates should be an array', async () => {
    const quadlet = getQuadletService();
    const templates = quadlet.templates();

    expect(templates).toBeInstanceOf(Array);
  });
});

describe('QuadletService#writeIntoMachine', () => {
  test('should create a withProgress task', async () => {
    const quadlet = getQuadletService();

    await quadlet.writeIntoMachine({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      files: [],
    });

    expect(WINDOW_MOCK.withProgress).toHaveBeenCalledWith(
      {
        location: ProgressLocation.TASK_WIDGET,
        title: `Saving`,
      },
      expect.any(Function),
    );
  });

  test('expect daemon reload by default', async () => {
    const quadlet = getQuadletService();

    await quadlet.writeIntoMachine({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      files: [],
    });

    expect(SYSTEMD_SERVICE_MOCK.daemonReload).toHaveBeenCalledOnce();
    expect(SYSTEMD_SERVICE_MOCK.daemonReload).toHaveBeenCalledWith({
      admin: false,
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
    });
  });

  test('expect skipSystemdDaemonReload options to disable daemon reload', async () => {
    const quadlet = getQuadletService();

    await quadlet.writeIntoMachine({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      files: [],
      skipSystemdDaemonReload: true,
    });

    expect(SYSTEMD_SERVICE_MOCK.daemonReload).not.toHaveBeenCalled();
  });

  test('should save each files in appropriate folder', async () => {
    const quadlet = getQuadletService();

    const files = Array.from({ length: 10 }, (_, index) => ({
      filename: `${index}.yaml`,
      content: `${index}-content`,
    }));

    await quadlet.writeIntoMachine({
      provider: WSL_RUNNING_PROVIDER_CONNECTION_MOCK,
      files: files,
    });

    files.forEach(file => {
      expect(PODMAN_WORKER_MOCK.write).toHaveBeenCalledWith(
        joinposix('~/.config/containers/systemd', file.filename),
        file.content,
      );
    });
  });
});
