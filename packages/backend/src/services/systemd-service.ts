/**
 * @author axel7083
 */
import type { Disposable, ProviderContainerConnection } from '@podman-desktop/api';
import type { SystemdServiceDependencies } from './systemd-helper';
import { SystemdHelper } from './systemd-helper';
import type { AsyncInit } from '../utils/async-init';
import { TelemetryEvents } from '../utils/telemetry-events';
import type { PodmanWorker } from '../utils/worker/podman-worker';

export class SystemdService extends SystemdHelper implements Disposable, AsyncInit {
  constructor(dependencies: SystemdServiceDependencies) {
    super(dependencies);
  }

  async init(): Promise<void> {}

  async getSystemctlVersion(provider: ProviderContainerConnection): Promise<string> {
    // get the worker
    const worker: PodmanWorker = await this.podman.getWorker(provider);

    const result = await worker.systemctlExec({
      args: ['--version'],
    });
    return result.stdout;
  }

  async getActiveStatus(options: {
    provider: ProviderContainerConnection;
    services: string[];
    /**
     * @default false (Run as systemd user)
     */
    admin: boolean;
  }): Promise<Record<string, boolean>> {
    // shortcut if length is 0
    if (options.services.length === 0) return {};

    const args: string[] = [];
    if (!options.admin) {
      args.push('--user');
    }
    args.push(...['is-active', '--output=json']);
    args.push(...options.services);

    console.log(`[SystemdService] running ${args}`);

    // get the worker
    const worker: PodmanWorker = await this.podman.getWorker(options.provider);

    // execute the systemctl command with appropriate arguments
    const result = await worker.systemctlExec({
      args,
    });
    const lines: string[] = result.stdout.trim().split('\n');

    if (lines.length !== options.services.length)
      throw new Error(
        `Something went wrong while getting is-active of services, required the state of ${options.services.length} services got ${lines.length} values.`,
      );

    return Object.fromEntries(lines.map((line, index) => [options.services[index], line === 'active']));
  }

  dispose(): void {}

  /**
   * This method will run `systemctl daemon-reload`
   * @param options
   */
  public async daemonReload(options: {
    provider: ProviderContainerConnection;
    /**
     * @default false (Run as systemd user)
     */
    admin: boolean;
  }): Promise<boolean> {
    const args: string[] = [];
    if (!options.admin) {
      args.push('--user');
    }
    args.push('daemon-reload');

    // get the worker
    const worker: PodmanWorker = await this.podman.getWorker(options.provider);

    // execute the systemctl command with appropriate arguments
    const result = await worker.systemctlExec({
      args,
    });
    return result.stderr.length === 0;
  }

  async start(options: {
    provider: ProviderContainerConnection;
    service: string;
    /**
     * @default false (Run as systemd user)
     */
    admin: boolean;
  }): Promise<boolean> {
    const telemetry: Record<string, unknown> = {
      admin: options.admin,
    };

    try {
      const args: string[] = [];
      if (!options.admin) {
        args.push('--user');
      }
      args.push(...['start', options.service]);

      // get the worker
      const worker: PodmanWorker = await this.podman.getWorker(options.provider);

      // execute the systemctl command with appropriate arguments
      const result = await worker.systemctlExec({
        args,
      });
      return result.stderr.length === 0;
    } catch (err: unknown) {
      telemetry['error'] = err;
      throw err;
    } finally {
      this.logUsage(TelemetryEvents.SYSTEMD_START, telemetry);
    }
  }

  async stop(options: {
    provider: ProviderContainerConnection;
    service: string;
    /**
     * @default false (Run as systemd user)
     */
    admin: boolean;
  }): Promise<boolean> {
    const telemetry: Record<string, unknown> = {
      admin: options.admin,
    };

    try {
      const args: string[] = [];
      if (!options.admin) {
        args.push('--user');
      }
      args.push(...['stop', options.service]);

      // get the worker
      const worker: PodmanWorker = await this.podman.getWorker(options.provider);

      const result = await worker.systemctlExec({
        args,
      });
      return result.stderr.length === 0;
    } catch (err: unknown) {
      telemetry['error'] = err;
      throw err;
    } finally {
      this.logUsage(TelemetryEvents.SYSTEMD_STOP, telemetry);
    }
  }
}
