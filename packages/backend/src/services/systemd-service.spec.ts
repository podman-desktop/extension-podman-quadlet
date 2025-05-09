/**
 * @author axel7083
 */
import type { PodmanService } from './podman-service';
import { expect, test, vi, beforeEach } from 'vitest';
import { SystemdService } from './systemd-service';
import type { ProviderContainerConnection, TelemetryLogger } from '@podman-desktop/api';
import { TelemetryEvents } from '../utils/telemetry-events';
import type { PodmanWorker } from '../utils/worker/podman-worker';

const WSL_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    name: 'podman-machine',
    vmType: 'WSL',
    status: () => 'started',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const PODMAN_WORKER_MOCK: PodmanWorker = {
  read: vi.fn(),
  rm: vi.fn(),
  write: vi.fn(),
  exec: vi.fn(),
  systemctlExec: vi.fn(),
  quadletExec: vi.fn(),
} as unknown as PodmanWorker;

const PODMAN_SERVICE_MOCK: PodmanService = {
  getWorker: vi.fn(),
} as unknown as PodmanService;

const telemetryMock: TelemetryLogger = {
  logUsage: vi.fn(),
} as unknown as TelemetryLogger;

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(PODMAN_SERVICE_MOCK.getWorker).mockResolvedValue(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.systemctlExec).mockResolvedValue({
    stdout: '',
    stderr: '',
    command: '',
  });
});

function getSystemdService(): SystemdService {
  return new SystemdService({
    podman: PODMAN_SERVICE_MOCK,
    telemetry: telemetryMock,
  });
}

test('expect SystemdService#daemonReload to call PodmanService#systemctlExec', async () => {
  const systemd = getSystemdService();
  await systemd.daemonReload({
    provider: WSL_PROVIDER_CONNECTION_MOCK,
    admin: false,
  });
  expect(PODMAN_SERVICE_MOCK.getWorker).toHaveBeenCalledWith(WSL_PROVIDER_CONNECTION_MOCK);

  expect(PODMAN_WORKER_MOCK.systemctlExec).toHaveBeenCalledWith({
    args: ['--user', 'daemon-reload'],
  });
});

test('expect SystemdService#start to call PodmanService#systemctlExec', async () => {
  const systemd = getSystemdService();
  await systemd.start({
    provider: WSL_PROVIDER_CONNECTION_MOCK,
    service: 'dummy',
    admin: false,
  });

  expect(PODMAN_SERVICE_MOCK.getWorker).toHaveBeenCalledWith(WSL_PROVIDER_CONNECTION_MOCK);

  expect(PODMAN_WORKER_MOCK.systemctlExec).toHaveBeenCalledWith({
    args: ['--user', 'start', 'dummy'],
  });

  expect(telemetryMock.logUsage).toHaveBeenCalledWith(TelemetryEvents.SYSTEMD_START, {
    admin: false,
  });
});

test('expect SystemdService#stop to call PodmanService#systemctlExec', async () => {
  const systemd = getSystemdService();
  await systemd.stop({
    provider: WSL_PROVIDER_CONNECTION_MOCK,
    service: 'dummy',
    admin: false,
  });
  expect(PODMAN_SERVICE_MOCK.getWorker).toHaveBeenCalledWith(WSL_PROVIDER_CONNECTION_MOCK);

  expect(PODMAN_WORKER_MOCK.systemctlExec).toHaveBeenCalledWith({
    args: ['--user', 'stop', 'dummy'],
  });

  expect(telemetryMock.logUsage).toHaveBeenCalledWith(TelemetryEvents.SYSTEMD_STOP, {
    admin: false,
  });
});
