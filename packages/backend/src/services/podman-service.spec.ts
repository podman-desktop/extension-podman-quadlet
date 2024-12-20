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

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(),
}));

vi.mock('@podman-desktop/api', () => ({
  Disposable: {
    create: (fn: () => void): Disposable => ({ dispose: fn }),
  },
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

const providersMock: ProviderService = {} as ProviderService;

const WSL_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    vmType: 'WSL',
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
    ['machine', 'ssh', '/usr/libexec/podman/quadlet -user -dryrun'],
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
  expect(podmanExtensionApiMock.exports.exec).toHaveBeenCalledWith(['machine', 'ssh', 'echo hello world'], {
    token: CANCELLATION_SOURCE.token,
    connection: WSL_PROVIDER_CONNECTION_MOCK,
  });
  await vi.advanceTimersByTimeAsync(5000);

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
      ['machine', 'ssh', 'mkdir -p ~/.config/containers/systemd'],
      {
        connection: WSL_PROVIDER_CONNECTION_MOCK,
        token: expect.anything(),
      },
    );

    expect(podmanExtensionApiMock.exports.exec).toHaveBeenCalledWith(
      ['machine', 'ssh', `echo "${content}" > ${destination}`],
      {
        connection: WSL_PROVIDER_CONNECTION_MOCK,
        token: expect.anything(),
      },
    );
  });
});
