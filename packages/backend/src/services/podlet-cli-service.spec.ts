/**
 * @author axel7083
 */
import type {
  env,
  window,
  process as processApi,
  cli as cliApi,
  CliTool,
  ProviderContainerConnection,
  RunResult,
} from '@podman-desktop/api';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { PodletCliService } from './podlet-cli-service';
import type { Octokit } from '@octokit/rest';
import type { PodletCliDependencies } from './podlet-cli-helper';
import type { ProviderService } from './provider-service';
import type { PodmanService } from './podman-service';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';

const processApiMock: typeof processApi = {
  exec: vi.fn(),
} as unknown as typeof processApi;
const cliMock: typeof cliApi = {
  createCliTool: vi.fn(),
} as unknown as typeof cliApi;
const windowMock: typeof window = {} as unknown as typeof window;
const octokitMock: Octokit = {} as unknown as Octokit;

const providersMock: ProviderService = {
  getProviderContainerConnection: vi.fn(),
} as unknown as ProviderService;

const podmanMock: PodmanService = {
  isMachineRootful: vi.fn(),
} as unknown as PodmanService;

const WSL_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    vmType: 'WSL',
    name: 'podman-machine-default',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

vi.mock('@podman-desktop/api', () => ({
  ProgressLocation: {
    TASK_WIDGET: 2,
  },
}));

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(cliMock.createCliTool).mockReturnValue({
    registerInstaller: vi.fn(),
    version: '1.5.2',
  } as unknown as CliTool);

  vi.mocked(providersMock.getProviderContainerConnection).mockReturnValue(WSL_PROVIDER_CONNECTION_MOCK);
});

const STORAGE_PATH_MOCK = 'dummy-storage-path';

class PodletCliServiceTest extends PodletCliService {
  constructor(dependencies: PodletCliDependencies) {
    super(dependencies);
  }

  public override async getPodletVersion(executable: string): Promise<string> {
    return super.getPodletVersion(executable);
  }

  public override getWindowsAssetName(arch: string): string {
    return super.getWindowsAssetName(arch);
  }

  public override getMacAssetName(arch: string): string {
    return super.getMacAssetName(arch);
  }

  public override getLinuxAssetName(arch: string): string {
    return super.getLinuxAssetName(arch);
  }

  public override async extractPodletExecutable(options: {
    archive: string;
    assetName: string;
    destination: string;
    tmp: string;
  }): Promise<void> {
    return super.extractPodletExecutable(options);
  }

  public override async makeExecutable(filePath: string): Promise<void> {
    return super.makeExecutable(filePath);
  }
}

function getPodletCliService(options?: { isLinux?: boolean; isMac?: boolean; isWindows?: boolean }): PodletCliService {
  return new PodletCliServiceTest({
    env: {
      isLinux: options?.isLinux ?? false,
      isMac: options?.isMac ?? false,
      isWindows: options?.isWindows ?? false,
    } as typeof env,
    processApi: processApiMock,
    cliApi: cliMock,
    window: windowMock,
    octokit: octokitMock,
    storagePath: STORAGE_PATH_MOCK,
    providers: providersMock,
    podman: podmanMock,
  });
}

test('init should create cli tool', async () => {
  const podlet = getPodletCliService();
  await podlet.init();

  expect(cliMock.createCliTool).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'podlet',
      displayName: 'Podlet',
    }),
  );
});

test('dispose should dispose cli tool', async () => {
  const disposeMock = vi.fn();
  vi.mocked(cliMock.createCliTool).mockReturnValue({
    dispose: disposeMock,
    registerInstaller: vi.fn(),
  } as unknown as CliTool);
  const podlet = getPodletCliService();
  await podlet.init();

  podlet.dispose();
  expect(disposeMock).toHaveBeenCalledOnce();
});

describe('podlet installed', () => {
  beforeEach(() => {
    // mock where result
    vi.mocked(processApiMock.exec).mockResolvedValueOnce({
      command: '',
      stdout: 'C:/tmp/podlet.exe',
      stderr: '',
    });
    // mock podlet --version result
    vi.mocked(processApiMock.exec).mockResolvedValueOnce({
      command: '',
      stdout: 'podlet 1.5.2',
      stderr: '',
    });
  });

  test('init should check podlet install', async () => {
    const podlet = getPodletCliService({
      isWindows: true,
    });
    await podlet.init();

    expect(processApiMock.exec).toHaveBeenCalledWith('where.exe', ['podlet.exe']);
    expect(processApiMock.exec).toHaveBeenCalledWith('C:/tmp/podlet.exe', ['--version']);

    expect(podlet.isInstalled()).toBeTruthy();
  });

  test('exec should check rootful machine', async () => {
    const podletRunResult: RunResult = {
      command: 'podlet generate container <container-id>',
      stdout: 'dummy-stdout',
      stderr: '',
    };
    // mock podlet generate container <container-id>
    vi.mocked(processApiMock.exec).mockResolvedValueOnce(podletRunResult);

    const podlet = getPodletCliService({
      isWindows: true,
    });
    await podlet.init();

    const connection: ProviderContainerConnectionIdentifierInfo = {
      name: WSL_PROVIDER_CONNECTION_MOCK.connection.name,
      providerId: WSL_PROVIDER_CONNECTION_MOCK.providerId,
    };
    const result = await podlet.exec(['generate', 'container', '<container-id>'], connection);
    expect(result).toStrictEqual(podletRunResult);

    // should fetch the provider container connection
    expect(providersMock.getProviderContainerConnection).toHaveBeenCalledWith(connection);

    // should have check the machine is rootful since vmtype is defined
    expect(podmanMock.isMachineRootful).toHaveBeenCalledWith(WSL_PROVIDER_CONNECTION_MOCK);

    expect(processApiMock.exec).toHaveBeenCalledWith('C:/tmp/podlet.exe', ['generate', 'container', '<container-id>'], {
      env: {
        CONTAINER_CONNECTION: 'podman-machine-default',
      },
    });
  });

  test('rootful machine should append -root to connection name', async () => {
    // mock rootful machine
    vi.mocked(podmanMock.isMachineRootful).mockResolvedValue(true);

    // mock podlet generate container <container-id>
    vi.mocked(processApiMock.exec).mockResolvedValueOnce({
      command: 'podlet generate container <container-id>',
      stdout: 'dummy-stdout',
      stderr: '',
    });

    const podlet = getPodletCliService({
      isWindows: true,
    });
    await podlet.init();

    await podlet.exec([], {
      name: WSL_PROVIDER_CONNECTION_MOCK.connection.name,
      providerId: WSL_PROVIDER_CONNECTION_MOCK.providerId,
    });

    expect(processApiMock.exec).toHaveBeenCalledWith('C:/tmp/podlet.exe', [], {
      env: {
        CONTAINER_CONNECTION: 'podman-machine-default-root',
      },
    });
  });
});
