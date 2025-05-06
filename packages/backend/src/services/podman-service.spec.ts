/**
 * @author axel7083
 */
import type {
  env as envApi,
  Extension,
  extensions,
  process as processApi,
  ProviderContainerConnection,
  RunError,
  RunResult,
  Uri,
} from '@podman-desktop/api';
import { CancellationTokenSource } from '@podman-desktop/api';
import { expect, test, vi, beforeEach, describe, afterEach } from 'vitest';
import { PodmanService } from './podman-service';
import type { PodmanExtensionApi } from '@podman-desktop/podman-extension-api';
import { PODMAN_EXTENSION_ID } from '../utils/constants';
import type { ProviderService } from './provider-service';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path/posix';
import type { PodmanConnection } from '../models/podman-connection';

vi.mock(import('node:fs/promises'));
vi.mock(import('node:os'));

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

const providersMock: ProviderService = {} as ProviderService;

const WSL_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    vmType: 'WSL',
    name: 'podman-machine-default',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const NATIVE_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    vmType: undefined,
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const RUN_RESULT_MOCK: RunResult = {
  stdout: 'dummy-stdout',
  stderr: 'dummy-stderr',
  command: 'dummy-command',
};

const WSL_CONNECTION_INFO_MOCK: PodmanConnection = {
  Name: WSL_PROVIDER_CONNECTION_MOCK.connection.name,
  IsMachine: true,
  URI: 'ssh://core@127.0.0.1:34427/run/user/1000/podman/podman.sock',
  Identity: '/home/potatoes/machine.socket',
  Default: false,
  ReadWrite: true,
};

const HOMEDIR_MOCK = '/home/dummy-user';

const CANCELLATION_SOURCE: CancellationTokenSource = {
  cancel: vi.fn(),
  dispose: vi.fn(),
  token: {
    isCancellationRequested: false,
    onCancellationRequested: vi.fn(),
  },
} as unknown as CancellationTokenSource;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.mocked(extensionsMock.getExtension).mockReturnValue(podmanExtensionApiMock);
  vi.mocked(podmanExtensionApiMock.exports.exec).mockResolvedValue(RUN_RESULT_MOCK);
  vi.mocked(homedir).mockReturnValue(HOMEDIR_MOCK);
  vi.mocked(CancellationTokenSource).mockReturnValue(CANCELLATION_SOURCE);
});

afterEach(() => {
  vi.useRealTimers();
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

test('init should subscribe to extensions events', async () => {
  const disposeMock = vi.fn();
  vi.mocked(extensionsMock.onDidChange).mockReturnValue({
    dispose: disposeMock,
  });
  const podman = getPodmanService();
  await podman.init();

  expect(extensionsMock.onDidChange).toHaveBeenCalledWith(expect.any(Function));

  podman.dispose();
  expect(disposeMock).toHaveBeenCalledOnce();
});

test('dispose should dispose extensions events subscriber', async () => {
  const disposeMock = vi.fn();
  vi.mocked(extensionsMock.onDidChange).mockReturnValue({
    dispose: disposeMock,
  });
  const podman = getPodmanService();
  await podman.init();

  podman.dispose();
  expect(disposeMock).toHaveBeenCalledOnce();
});

test('quadletExec should execute in podman machine on windows', async () => {
  const podman = getPodmanService({
    isWindows: true,
  });
  const result = await podman.quadletExec({
    connection: WSL_PROVIDER_CONNECTION_MOCK,
    args: ['-user -dryrun'],
  });

  expect(result).toStrictEqual(RUN_RESULT_MOCK);
  expect(podmanExtensionApiMock.exports.exec).toHaveBeenCalledWith(
    ['machine', 'ssh', WSL_PROVIDER_CONNECTION_MOCK.connection.name, '/usr/libexec/podman/quadlet -user -dryrun'],
    {
      connection: WSL_PROVIDER_CONNECTION_MOCK,
      token: expect.anything(),
    },
  );
});

test('systemctlExec should return RunError if contains exit code', async () => {
  const runResult: RunError = {
    ...RUN_RESULT_MOCK,
    exitCode: 3,
    name: 'dummy',
    killed: false,
    message: 'dummy-error-message',
    cancelled: false,
  };

  vi.mocked(podmanExtensionApiMock.exports.exec).mockRejectedValue(runResult);

  const podman = getPodmanService({
    isWindows: true,
  });
  const result = await podman.systemctlExec({
    connection: WSL_PROVIDER_CONNECTION_MOCK,
    args: [],
  });
  expect(result).toStrictEqual(expect.objectContaining(RUN_RESULT_MOCK));
});

test('expect a token to be created and disposed', async () => {
  expect(CancellationTokenSource).not.toHaveBeenCalled();
  const podman = getPodmanService();

  await podman['executeWrapper']({
    connection: WSL_PROVIDER_CONNECTION_MOCK,
    command: 'echo',
    args: ['hello world'],
  });

  expect(CancellationTokenSource).toHaveBeenCalledOnce();
  // get the source token
  expect(CANCELLATION_SOURCE.token.isCancellationRequested).toBeFalsy();
  expect(CANCELLATION_SOURCE.dispose).toHaveBeenCalledOnce();
  expect(CANCELLATION_SOURCE.cancel).not.toHaveBeenCalled();
});

test('expect a token to be created and cancelled', async () => {
  expect(CancellationTokenSource).not.toHaveBeenCalled();
  const podman = getPodmanService({
    isWindows: true,
  });

  let resolve: ((value: RunResult) => void) | undefined;
  let reject: ((err: Error) => void) | undefined;
  const promise = new Promise<RunResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  expect(resolve).toBeDefined();
  expect(reject).toBeDefined();
  expect(promise).toBeDefined();

  vi.mocked(podmanExtensionApiMock.exports.exec).mockReturnValue(promise);

  const execPromise = podman['executeWrapper']({
    connection: WSL_PROVIDER_CONNECTION_MOCK,
    command: 'echo',
    args: ['hello world'],
  });

  expect(CancellationTokenSource).toHaveBeenCalledOnce();
  expect(podmanExtensionApiMock.exports.exec).toHaveBeenCalledWith(
    ['machine', 'ssh', WSL_PROVIDER_CONNECTION_MOCK.connection.name, 'echo hello world'],
    {
      token: CANCELLATION_SOURCE.token,
      connection: WSL_PROVIDER_CONNECTION_MOCK,
    },
  );
  await vi.advanceTimersByTimeAsync(50_000);

  // ensure the source token has been cancelled
  await vi.waitFor(() => {
    // get the source token
    expect(CANCELLATION_SOURCE.dispose).toHaveBeenCalledOnce();
    expect(CANCELLATION_SOURCE.cancel).toHaveBeenCalledOnce();
  });

  reject?.(new Error('final rejected'));
  await expect(execPromise).rejects.toThrowError('final rejected');
});

describe('writeTextFile', () => {
  test('linux', async () => {
    const destination = '~/.config/containers/systemd/dummy.container';
    const content = 'dummy-content';

    const podman = getPodmanService({
      isLinux: true,
    });
    await podman.writeTextFile(NATIVE_PROVIDER_CONNECTION_MOCK, destination, content);

    // podman exec api not called
    expect(podmanExtensionApiMock.exports.exec).not.toHaveBeenCalled();

    const resolved = join(HOMEDIR_MOCK, '.config', 'containers', 'systemd');

    // ensure parent directory created
    expect(mkdir).toHaveBeenCalledWith(resolved, { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(join(resolved, 'dummy.container'), content, { encoding: 'utf8' });
  });

  test.each(['windows', 'mac'])('%s', async platform => {
    const destination = '~/.config/containers/systemd/dummy.container';
    const content = 'dummy-content';

    const podman = getPodmanService({
      isWindows: platform === 'windows',
      isMac: platform === 'mac',
    });
    await podman.writeTextFile(WSL_PROVIDER_CONNECTION_MOCK, destination, content);

    // on windows we do not use node:fs
    expect(mkdir).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();

    // mkdir
    expect(podmanExtensionApiMock.exports.exec).toHaveBeenCalledWith(
      ['machine', 'ssh', WSL_PROVIDER_CONNECTION_MOCK.connection.name, 'mkdir -p ~/.config/containers/systemd'],
      {
        connection: WSL_PROVIDER_CONNECTION_MOCK,
        token: expect.anything(),
      },
    );

    expect(podmanExtensionApiMock.exports.exec).toHaveBeenCalledWith(
      ['machine', 'ssh', WSL_PROVIDER_CONNECTION_MOCK.connection.name, `echo "${content}" > ${destination}`],
      {
        connection: WSL_PROVIDER_CONNECTION_MOCK,
        token: expect.anything(),
      },
    );
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

describe('podman connections', () => {
  test('PodmanService#getPodmanConnections should use podman#exec', async () => {
    vi.mocked(podmanExtensionApiMock.exports.exec).mockResolvedValue({
      stdout: JSON.stringify([WSL_CONNECTION_INFO_MOCK]),
      stderr: '',
      command: 'dummy-command',
    });

    const podman = getPodmanService();

    const connections = await podman.getPodmanConnections();
    expect(connections).toHaveLength(1);

    expect(connections[0]).toStrictEqual(WSL_CONNECTION_INFO_MOCK);
  });

  test('PodmanService#getPodmanConnections should exclude non-ssh connections', async () => {
    vi.mocked(podmanExtensionApiMock.exports.exec).mockResolvedValue({
      stdout: JSON.stringify([
        {
          ...WSL_CONNECTION_INFO_MOCK,
          URI: 'localhost:8888',
        },
      ]),
      stderr: '',
      command: 'dummy-command',
    });

    const podman = getPodmanService();

    const connections = await podman.getPodmanConnections();
    expect(connections).toHaveLength(0);
  });

  test('malformed output should throw an error', async () => {
    vi.mocked(podmanExtensionApiMock.exports.exec).mockResolvedValue({
      stdout: '{}', // not an array
      stderr: '',
      command: 'dummy-command',
    });

    const podman = getPodmanService();

    await expect(() => {
      return podman.getPodmanConnections();
    }).rejects.toThrowError('malformed output for podman system connection ls command.');
  });
});
