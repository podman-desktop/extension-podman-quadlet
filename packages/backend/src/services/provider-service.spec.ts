/**
 * @author axel7083
 */
import type { provider as Provider, ProviderContainerConnection, Webview } from '@podman-desktop/api';

import { expect, test, vi, beforeEach, describe } from 'vitest';
import { ProviderService } from './provider-service';

const PROVIDER_API_MOCK: typeof Provider = {
  getContainerConnections: vi.fn(),
  onDidRegisterContainerConnection: vi.fn(),
  onDidUnregisterContainerConnection: vi.fn(),
  onDidUpdateContainerConnection: vi.fn(),
} as unknown as typeof Provider;

const WEBVIEW_MOCK: Webview = {
  postMessage: vi.fn(),
} as unknown as Webview;

const WSL_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'podman',
    name: 'podman-machine',
    vmType: 'WSL',
    status: () => 'started',
  },
  providerId: 'podman',
} as ProviderContainerConnection;

const DOCKER_PROVIDER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    type: 'docker',
    name: 'docker-machine',
    vmType: 'WSL',
    status: () => 'started',
  },
  providerId: 'docker',
} as ProviderContainerConnection;

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(WEBVIEW_MOCK.postMessage).mockResolvedValue(true);
});

function getProviderService(): ProviderService {
  return new ProviderService({
    providers: PROVIDER_API_MOCK,
    webview: WEBVIEW_MOCK,
  });
}

test('ProviderService#all should use provider api', async () => {
  vi.mocked(PROVIDER_API_MOCK.getContainerConnections).mockReturnValue([WSL_PROVIDER_CONNECTION_MOCK]);

  const providers = getProviderService();
  const connections = providers.all();
  expect(connections).toHaveLength(1);
  expect(connections[0]).toStrictEqual({
    name: 'podman-machine',
    providerId: 'podman',
    status: 'started',
    vmType: 'WSL',
  });
});

test('ProviderService#all should exclude docker connection', async () => {
  vi.mocked(PROVIDER_API_MOCK.getContainerConnections).mockReturnValue([
    WSL_PROVIDER_CONNECTION_MOCK,
    DOCKER_PROVIDER_CONNECTION_MOCK,
  ]);

  const providers = getProviderService();
  const connections = providers.all();
  expect(connections).toHaveLength(1);
  expect(connections[0]).toStrictEqual({
    name: 'podman-machine',
    providerId: 'podman',
    status: 'started',
    vmType: 'WSL',
  });
});

describe('init', () => {
  beforeEach(() => {
    vi.mocked(PROVIDER_API_MOCK.getContainerConnections).mockReturnValue([]);
  });

  test('should register container connections listener', async () => {
    const providers = getProviderService();
    await providers.init();

    // listen to new container connection
    expect(PROVIDER_API_MOCK.onDidRegisterContainerConnection).toHaveBeenCalledExactlyOnceWith(expect.any(Function));

    // listen to remove of container connection
    expect(PROVIDER_API_MOCK.onDidUnregisterContainerConnection).toHaveBeenCalledExactlyOnceWith(expect.any(Function));

    // listen to update of container connection
    expect(PROVIDER_API_MOCK.onDidUpdateContainerConnection).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
  });

  test('container connection update should notify for events', async () => {
    const listener = vi.fn();

    const providers = getProviderService();
    await providers.init();

    // register a listener to the ProviderService
    providers.event(listener);

    const registerListener = vi.mocked(PROVIDER_API_MOCK.onDidRegisterContainerConnection).mock.calls[0][0];
    registerListener(WSL_PROVIDER_CONNECTION_MOCK);

    expect(listener).toHaveBeenCalledOnce();
  });
});
