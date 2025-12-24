/**
 * @author axel7083
 */
import type {
  Disposable,
  env as envApi,
  Extension,
  extensions,
  process as processApi,
  ProviderContainerConnection,
  RunResult,
  Uri,
} from '@podman-desktop/api';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { PodmanService } from './podman-service';
import type { PodmanExtensionApi } from '@podman-desktop/podman-extension-api';
import { PODMAN_EXTENSION_ID } from '../utils/constants';
import type { ProviderService } from './provider-service';
import { homedir } from 'node:os';
import type { PodmanConnection } from '../models/podman-connection';
import { PodmanSSHWorker } from '../utils/worker/podman-ssh-worker';
import { PodmanNativeWorker } from '../utils/worker/podman-native-worker';

vi.mock(import('node:fs/promises'));
vi.mock(import('node:os'));
// mock podman-workers
vi.mock(import('../utils/worker/podman-ssh-worker'));
vi.mock(import('../utils/worker/podman-native-worker'));
vi.mock(import('@podman-desktop/api'), () => ({
  CancellationTokenSource: vi.fn(),
}));

const extensionsMock: typeof extensions = {
  getExtension: vi.fn(),
  onDidChange: vi.fn(),
} as unknown as typeof extensions;

const podmanExtensionApiMock: Extension<PodmanExtensionApi> = {
  id: PODMAN_EXTENSION_ID,
  extensionPath: '',
  extensionUri: {} as unknown as Uri,
  packageJSON: {},
  exports: {
    exec: vi.fn(),
  },
};

const processApiMock: typeof processApi = {} as unknown as typeof processApi;

const providersMock: ProviderService = {
  event: vi.fn(),
} as unknown as ProviderService;

const WSL_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    vmType: 'WSL',
    name: 'podman-machine-default',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const WSL_CONNECTION_INFO_MOCK: PodmanConnection = {
  Name: WSL_PROVIDER_CONNECTION_MOCK.connection.name,
  IsMachine: true,
  URI: 'ssh://core@127.0.0.1:34427/run/user/1000/podman/podman.sock',
  Identity: '/home/potatoes/machine.socket',
  Default: false,
  ReadWrite: true,
};

const NATIVE_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    vmType: undefined,
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const RUN_RESULT_MOCK: RunResult = {
  stdout: '[]',
  stderr: '',
  command: 'dummy-command',
};

const HOMEDIR_MOCK = '/home/dummy-user';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(extensionsMock.getExtension).mockReturnValue(podmanExtensionApiMock);
  vi.mocked(podmanExtensionApiMock.exports.exec).mockResolvedValue(RUN_RESULT_MOCK);
  vi.mocked(homedir).mockReturnValue(HOMEDIR_MOCK);
});

function getPodmanService(options?: { isLinux?: boolean; isMac?: boolean; isWindows?: boolean }): PodmanService {
  return new PodmanService({
    env: {
      isLinux: options?.isLinux ?? false,
      isMac: options?.isMac ?? false,
      isWindows: options?.isWindows ?? false,
    } as typeof envApi,
    extensions: extensionsMock,
    processApi: processApiMock,
    providers: providersMock,
  });
}

describe('PodmanService#init', () => {
  const EXTENSION_EVENT_DISPOSABLE: Disposable = {
    dispose: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(extensionsMock.onDidChange).mockReturnValue(EXTENSION_EVENT_DISPOSABLE);
  });

  test('init should subscribe to extensions events', async () => {
    const podman = getPodmanService();
    await podman.init();

    expect(extensionsMock.onDidChange).toHaveBeenCalledWith(expect.any(Function));

    podman.dispose();
    expect(EXTENSION_EVENT_DISPOSABLE.dispose).toHaveBeenCalledOnce();
  });

  test('init should collect all podman connections', async () => {
    vi.mocked(podmanExtensionApiMock.exports.exec).mockResolvedValue({
      stdout: JSON.stringify([WSL_CONNECTION_INFO_MOCK]),
      stderr: '',
      command: 'dummy-command',
    });

    const podman = getPodmanService();
    await podman.init();

    const connections = await podman.getPodmanConnections();
    expect(connections).toHaveLength(1);

    expect(podman.getConnection(WSL_PROVIDER_CONNECTION_MOCK)).toStrictEqual(WSL_CONNECTION_INFO_MOCK);
  });
});

describe('PodmanService#getWorker', () => {
  let podman: PodmanService;
  beforeEach(async () => {
    vi.mocked(podmanExtensionApiMock.exports.exec).mockResolvedValue({
      stdout: JSON.stringify([WSL_CONNECTION_INFO_MOCK]),
      stderr: '',
      command: 'dummy-command',
    });
  });

  test('remote connection should be created', async () => {
    podman = getPodmanService();
    await podman.init();

    const worker = await podman.getWorker(WSL_PROVIDER_CONNECTION_MOCK);
    expect(worker).toBeDefined();

    expect(PodmanSSHWorker).toHaveBeenCalledOnce();
    expect(PodmanNativeWorker).not.toHaveBeenCalled();
  });

  test('remote connection should be cached', async () => {
    podman = getPodmanService();
    await podman.init();

    // call twice
    await podman.getWorker(WSL_PROVIDER_CONNECTION_MOCK);
    await podman.getWorker(WSL_PROVIDER_CONNECTION_MOCK);

    // only created once
    expect(PodmanSSHWorker).toHaveBeenCalledOnce();
    expect(PodmanNativeWorker).not.toHaveBeenCalled();
  });

  test('native connection should be created', async () => {
    podman = getPodmanService({
      isLinux: true,
    });
    await podman.init();

    const worker = await podman.getWorker(NATIVE_PROVIDER_CONNECTION_MOCK);
    expect(worker).toBeDefined();

    expect(PodmanNativeWorker).toHaveBeenCalledOnce();
    expect(PodmanSSHWorker).not.toHaveBeenCalled();
  });

  test('native connection should be cached', async () => {
    podman = getPodmanService({
      isLinux: true,
    });
    await podman.init();

    // call twice
    await podman.getWorker(NATIVE_PROVIDER_CONNECTION_MOCK);
    await podman.getWorker(NATIVE_PROVIDER_CONNECTION_MOCK);

    // only created once
    expect(PodmanNativeWorker).toHaveBeenCalledOnce();
    expect(PodmanSSHWorker).not.toHaveBeenCalled();
  });
});

describe('isMachineRootful', () => {
  test('connection without vmType should throw an error', async () => {
    const podman = getPodmanService();

    await expect(() => {
      return podman.isMachineRootful(NATIVE_PROVIDER_CONNECTION_MOCK);
    }).rejects.toThrowError('connection provided is not a podman machine (native connection)');
  });

  test('connection should be forwarded to podman#exec', async () => {
    const podman = getPodmanService();

    await podman.isMachineRootful(WSL_PROVIDER_CONNECTION_MOCK);
    expect(podmanExtensionApiMock.exports.exec).toHaveBeenCalledWith(
      ['machine', 'inspect', '--format', '{{.Rootful}}', WSL_PROVIDER_CONNECTION_MOCK.connection.name],
      {
        connection: WSL_PROVIDER_CONNECTION_MOCK,
      },
    );
  });

  test('stdout with string true should return true boolean', async () => {
    const podman = getPodmanService();

    // mock yes in stdout
    vi.mocked(podmanExtensionApiMock.exports.exec).mockResolvedValue({
      command: 'dummy',
      stderr: '',
      stdout: 'true',
    });

    const result = await podman.isMachineRootful(WSL_PROVIDER_CONNECTION_MOCK);
    expect(result).toBeTruthy();
  });

  test('invalid string in stdout should return false', async () => {
    const podman = getPodmanService();

    // mock yes in stdout
    vi.mocked(podmanExtensionApiMock.exports.exec).mockResolvedValue({
      command: 'dummy',
      stderr: '',
      stdout: 'potatoes',
    });

    const result = await podman.isMachineRootful(WSL_PROVIDER_CONNECTION_MOCK);
    expect(result).toBeFalsy();
  });
});
