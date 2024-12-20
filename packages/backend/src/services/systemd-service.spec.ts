/**
 * @author axel7083
 */
import type { PodmanService } from './podman-service';
import { expect, test, vi, beforeEach } from 'vitest';
import { SystemdService } from './systemd-service';
import type { ProviderContainerConnection } from '@podman-desktop/api';

const WSL_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    name: 'podman-machine',
    vmType: 'WSL',
    status: () => 'started',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const podmanServiceMock: PodmanService = {
  systemctlExec: vi.fn(),
} as unknown as PodmanService;

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(podmanServiceMock.systemctlExec).mockResolvedValue({
    stdout: '',
    stderr: '',
    command: '',
  });
});

function getSystemdService(): SystemdService {
  return new SystemdService({
    podman: podmanServiceMock,
  });
}

test('expect SystemdService#daemonReload to call PodmanService#systemctlExec', async () => {
  const systemd = getSystemdService();
  await systemd.daemonReload({
    provider: WSL_PROVIDER_CONNECTION_MOCK,
    admin: false,
  });

  expect(podmanServiceMock.systemctlExec).toHaveBeenCalledWith({
    connection: WSL_PROVIDER_CONNECTION_MOCK,
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

  expect(podmanServiceMock.systemctlExec).toHaveBeenCalledWith({
    connection: WSL_PROVIDER_CONNECTION_MOCK,
    args: ['--user', 'start', 'dummy'],
  });
});

test('expect SystemdService#stop to call PodmanService#systemctlExec', async () => {
  const systemd = getSystemdService();
  await systemd.stop({
    provider: WSL_PROVIDER_CONNECTION_MOCK,
    service: 'dummy',
    admin: false,
  });

  expect(podmanServiceMock.systemctlExec).toHaveBeenCalledWith({
    connection: WSL_PROVIDER_CONNECTION_MOCK,
    args: ['--user', 'stop', 'dummy'],
  });
});
