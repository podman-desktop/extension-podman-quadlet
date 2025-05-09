/**
 * @author axel7083
 */
import type { env, extensions as Extensions, process as ProcessApi } from '@podman-desktop/api';
import type { PodmanExtensionApi } from '@podman-desktop/podman-extension-api';
import { PODMAN_EXTENSION_ID } from '../utils/constants';
import type { ProviderService } from './provider-service';
import type { PodmanConnection } from '../models/podman-connection';

export interface PodmanDependencies {
  extensions: typeof Extensions;
  providers: ProviderService;
  env: typeof env;
  processApi: typeof ProcessApi;
}

export abstract class PodmanHelper {
  protected constructor(protected dependencies: PodmanDependencies) {}

  protected get isLinux(): boolean {
    return this.dependencies.env.isLinux;
  }

  protected get isWindows(): boolean {
    return this.dependencies.env.isWindows;
  }

  protected get isMac(): boolean {
    return this.dependencies.env.isMac;
  }

  // smart podman extension api getter with some cache
  #podman: PodmanExtensionApi | undefined;
  protected get podman(): PodmanExtensionApi {
    if (!this.#podman) {
      this.#podman = this.getPodmanExtension();
    }
    return this.#podman;
  }

  protected resetPodmanExtensionApiCache(): void {
    this.#podman = undefined;
  }

  protected getPodmanExtension(): PodmanExtensionApi {
    const podman = this.dependencies.extensions.getExtension(PODMAN_EXTENSION_ID);
    if (!podman) throw new Error('podman extension not found');

    if (!('exec' in podman.exports) || typeof podman.exports.exec !== 'function') {
      throw new Error('invalid podman extension exports');
    }

    return podman.exports;
  }

  /**
   * Get podman connections
   * @remarks only ssh protocol is supported
   */
  public async getPodmanConnections(): Promise<Array<PodmanConnection>> {
    const { stdout } = await this.podman.exec(['system', 'connection', 'ls', '--format=json']);
    const connections: Array<PodmanConnection> = JSON.parse(stdout);
    // validate output
    if (!Array.isArray(connections)) throw new Error('malformed output for podman system connection ls command.');

    // filter out all machines (that are local)
    return connections.filter(connection => connection.URI.startsWith('ssh:'));
  }
}
