/**
 * @author axel7083
 */
import type { ProviderContainerConnection, Disposable } from '@podman-desktop/api';
import type { PodmanDependencies } from './podman-helper';
import { PodmanHelper } from './podman-helper';
import type { AsyncInit } from '../utils/async-init';
import type { PodmanWorker } from '../utils/worker/podman-worker';
import { PodmanNativeWorker } from '../utils/worker/podman-native-worker';
import { readFile } from 'node:fs/promises';
import { PodmanSSHWorker } from '../utils/worker/podman-ssh-worker';
import type { PodmanConnection } from '../models/podman-connection';

export class PodmanService extends PodmanHelper implements Disposable, AsyncInit {
  #extensionsEventDisposable: Disposable | undefined;
  #pools: Map<string, PodmanWorker>;
  #connections: Map<string, PodmanConnection>;

  constructor(dependencies: PodmanDependencies) {
    super(dependencies);
    // create a Pool of Podman Workers
    this.#pools = new Map();
    // create a map to store the connections
    this.#connections = new Map();
  }

  /**
   * Let's have a function to compute the key given a {@link ProviderContainerConnection}
   * for the #pools of workers
   * @param connection
   * @protected
   */
  protected getKey(connection: ProviderContainerConnection): string {
    return `${connection.providerId}:${connection.connection.name}`;
  }

  async init(): Promise<void> {
    // track if podman extension is disabled
    this.#extensionsEventDisposable = this.dependencies.extensions.onDidChange(() => {
      this.resetPodmanExtensionApiCache(); // reset podman cache
    });
    // listen for any providers update
    this.dependencies.providers.event(this.onProviderUpdate.bind(this));
    // update the collection of connections
    return this.collectConnections();
  }

  protected onProviderUpdate(): void {
    // update the podman remote connections info
    this.collectConnections().catch(console.error);
  }

  /**
   * Check if a given machine is rootful
   * @param connection
   */
  public async isMachineRootful(connection: ProviderContainerConnection): Promise<boolean> {
    if (!connection.connection.vmType)
      throw new Error('connection provided is not a podman machine (native connection)');

    const result = await this.podman.exec(
      ['machine', 'inspect', '--format', '{{.Rootful}}', connection.connection.name],
      {
        connection: connection,
      },
    );
    return result.stdout.trim() === 'true';
  }

  protected async collectConnections(): Promise<void> {
    const connections = await this.getPodmanConnections();
    this.#connections = new Map<string, PodmanConnection>(connections.map(connection => [connection.Name, connection]));
  }

  public hasConnection(connection: ProviderContainerConnection): boolean {
    return this.#connections?.has(connection.connection.name) ?? false;
  }

  public getConnection(connection: ProviderContainerConnection): PodmanConnection {
    const remote = this.#connections?.get(connection.connection.name);
    if (!remote) throw new Error(`could not get remote connection for connection ${connection.connection.name}`);
    return remote;
  }

  /**
   * To interact with a podman instance we use {@link PodmanWorker} class
   * which has a series of functions (read, write, rm, exec etc.)
   *
   * The {@link PodmanWorker} in an abstract class, as depending on the instance would need
   * specific logic.
   *
   * This function get a worker from the cache if we already have one, otherwise will instantiate
   * a new worker for the given connection.
   *
   * @param connection
   */
  async getWorker(connection: ProviderContainerConnection): Promise<PodmanWorker> {
    const key = this.getKey(connection);
    const worker = this.#pools.get(key);
    if (worker) return worker;

    // detect podman linux native
    if (this.isLinux && !this.hasConnection(connection)) {
      const native = new PodmanNativeWorker(connection, this.dependencies.processApi);
      // init
      await native.init();
      // cache
      this.#pools.set(key, native);
      return native;
    }

    // create PodmanSSHWorker
    const { URI, Identity, IsMachine } = this.getConnection(connection);
    if (!IsMachine) {
      console.warn('[PodmanWorkers] detected remote connection: this is an experimental feature');
    }

    const url = new URL(URI);
    if (!url) throw new Error('cannot parse URI from podman connection: null URI');
    if (!Identity) throw new Error('remote connection without identity specified is not supported');

    const privateKey = await readFile(Identity, { encoding: 'utf8' });

    // create the SSH Worker
    const sshWorker = new PodmanSSHWorker(connection, {
      host: url.hostname,
      port: parseInt(url.port),
      username: url.username,
      privateKey,
    });

    // init
    await sshWorker.init();

    // update the pools
    this.#pools.set(key, sshWorker);
    return sshWorker;
  }

  dispose(): void {
    this.#extensionsEventDisposable?.dispose();

    // dispose workers
    this.#pools.forEach(pool => pool.dispose());
    this.#pools.clear();

    // cleanup connection map
    this.#connections?.clear();
  }
}
