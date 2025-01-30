/**
 * @author axel7083
 */

import { ProgressLocation } from '@podman-desktop/api';
import type { Disposable, ProviderContainerConnection } from '@podman-desktop/api';
import type { QuadletServiceDependencies } from './quadlet-helper';
import { QuadletHelper } from './quadlet-helper';
import { QuadletDryRunParser } from '../utils/parsers/quadlet-dryrun-parser';
import type { Quadlet } from '../models/quadlet';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import type { AsyncInit } from '../utils/async-init';
import { join as joinposix, basename } from 'node:path/posix';
import { load } from 'js-yaml';
import { QuadletTypeParser } from '../utils/parsers/quadlet-type-parser';
import type { SynchronisationInfo } from '/@shared/src/models/synchronisation';
import { TelemetryEvents } from '../utils/telemetry-events';
import type { QuadletType } from '/@shared/src/utils/quadlet-type';

export class QuadletService extends QuadletHelper implements Disposable, AsyncInit {
  #extensionsEventDisposable: Disposable | undefined;
  // symbols are internal to QuadletService: do not expose outside
  #value: Map<symbol, Quadlet[]>;
  #synchronisation: Map<symbol, number>;

  constructor(dependencies: QuadletServiceDependencies) {
    super(dependencies);
    this.#value = new Map<symbol, Quadlet[]>();
    this.#synchronisation = new Map<symbol, number>();
  }

  /**
   * Transform the Map<ProviderContainerConnection, Quadlet[]> to a flat {@link QuadletInfo} array
   */
  override all(): QuadletInfo[] {
    return Array.from(this.#value).reduce((output, [symbol, quadlets]) => {
      const { providerId, name } = this.fromSymbol(symbol);
      // adding all quadlets
      output.push(
        ...quadlets.map(quadlet => ({
          ...quadlet,
          connection: {
            providerId: providerId,
            name: name,
          },
        })),
      );
      return output;
    }, [] as QuadletInfo[]);
  }

  async init(): Promise<void> {}

  protected findQuadlet(options: { provider: ProviderContainerConnection; id: string }): Quadlet | undefined {
    // get the corresponding symbol
    const symbol = this.getSymbol(options.provider);
    // find in corresponding quadlets
    return this.#value.get(symbol)?.find(quadlet => quadlet.id === options.id);
  }

  /**
   * Given a {@link ProviderContainerConnection} and an Array<string> of Quadlet ids return a matching Array<Quadlet>
   * @remarks will throw an error if one of the id has no matching Quadlet.
   * @param options
   * @protected
   */
  protected getQuadlets(options: { provider: ProviderContainerConnection; ids: string[] }): Quadlet[] {
    // get the corresponding symbol
    const symbol = this.getSymbol(options.provider);

    // get in corresponding quadlets
    const quadlets: Map<string, Quadlet> = new Map(
      (this.#value.get(symbol) ?? []).map(quadlet => [quadlet.id, quadlet]),
    );

    return options.ids.map(id => {
      const quadlet = quadlets.get(id);
      if (quadlet) return quadlet;
      throw new Error(
        `cannot found quadlet with id ${id} and provider ${options.provider.providerId}:${options.provider.connection.name}`,
      );
    });
  }

  /**
   * This method remove an entry in the #values map
   * @param options
   * @protected
   */
  protected removeEntry(options: { provider: ProviderContainerConnection; id: string }): void {
    // get the corresponding symbol
    const symbol = this.getSymbol(options.provider);
    // update the value
    this.#value.set(
      symbol,
      (this.#value.get(symbol) ?? []).filter(quadlet => quadlet.id !== options.id),
    );
    // notify
    this.notify();
  }

  /**
   * The quadlet executable is installed at /usr/libexec/podman/quadlet on the podman machine
   * @protected
   * @param provider
   */
  protected async getQuadletVersion(provider: ProviderContainerConnection): Promise<string> {
    const result = await this.podman.quadletExec({
      connection: provider,
      args: ['-version'],
    });
    return result.stdout;
  }

  protected async getPodmanQuadlets(options: {
    provider: ProviderContainerConnection;
    /**
     * @default false (Run as systemd user)
     */
    admin?: boolean;
  }): Promise<Quadlet[]> {
    const args: string[] = ['-dryrun'];
    if (!options.admin) {
      args.push('-user');
    }
    const result = await this.podman.quadletExec({
      connection: options.provider,
      args,
    });

    const parser = new QuadletDryRunParser(result.stdout);
    return parser.parse();
  }

  async collectPodmanQuadlet(): Promise<void> {
    this.#value.clear();

    const containerProviders: ProviderContainerConnection[] = this.providers.getContainerConnections();
    console.log(`[QuadletService] collectPodmanQuadlet found ${containerProviders.length} connections`);

    for (const provider of containerProviders) {
      // only care about podman connection
      if (provider.connection.type !== 'podman') {
        console.warn(
          `[QuadletService] ignoring connection ${provider.connection.name} of provider ${provider.providerId}, type is ${provider.connection.type}`,
        );
        continue;
      }

      // only care about started connection
      const status = provider.connection.status();
      if (status !== 'started') {
        console.warn(
          `[QuadletService] ignoring connection ${provider.connection.name} of provider ${provider.providerId}, status is ${status}`,
        );
        continue;
      }

      // 1. we check the systemctl version
      const systemctlVersion = await this.dependencies.systemd.getSystemctlVersion(provider);
      console.log(`[QuadletService] systemctlVersion ${systemctlVersion}`);

      // 2. check the quadlet version
      const quadletVersion = await this.getQuadletVersion(provider);
      console.log(
        `[QuadletService] found quadlet version ${quadletVersion} for connection ${provider.connection.name} of provider ${provider.providerId}`,
      );

      // 3. get the quadlets
      const quadlets = await this.getPodmanQuadlets({ provider, admin: false });

      // 4. update internally but do not notify (we need to collect the statuses)
      this.update(provider, quadlets, false);

      // 5. Refresh the status if some quadlets are found
      if (quadlets.length > 0) {
        await this.refreshQuadletsStatuses(false);
      }
    }
    // notify completion
    this.notify();
  }

  protected update(provider: ProviderContainerConnection, quadlets: Quadlet[], notify: boolean = true): void {
    // get corresponding symbol
    const symbol = this.getSymbol(provider);
    // update value & synchronisation
    this.#value.set(symbol, quadlets);
    this.#synchronisation.set(symbol, new Date().getTime());
    if (notify) this.notify();
  }

  /**
   * @remarks only refresh the statuses of ***known** quadlets, do not catch new ones.
   * todo: optimise ? paralele ?
   */
  async refreshQuadletsStatuses(notify = true): Promise<void> {
    for (const [symbol, quadlets] of Array.from(this.#value.entries())) {
      // retreive the provider from the symbol
      const providerIdentifier = this.fromSymbol(symbol);
      const provider = this.providers.getProviderContainerConnection(providerIdentifier);

      // get the statuses of the quadlets
      const statuses = await this.dependencies.systemd.getActiveStatus({
        provider: provider,
        admin: false,
        services: quadlets.map(quadlet => quadlet.id),
      });

      // update each quadlets
      for (const quadlet of quadlets) {
        if (quadlet.id in statuses) {
          quadlet.state = statuses[quadlet.id] ? 'active' : 'inactive';
        } else {
          quadlet.state = 'unknown';
        }
      }

      this.update(provider, quadlets, notify);
    }
  }

  protected splitResources(
    basename: string,
    content: string,
  ): { filename: string; content: string; type?: QuadletType }[] {
    const resources = content.split('---');
    return resources.map(resource => {
      try {
        const type = new QuadletTypeParser(resource).parse();
        return {
          filename: `${basename}.${type.toLowerCase()}`,
          content: resource,
          type,
        };
      } catch (err: unknown) {
        console.warn(err);
        load(resource);
        return {
          filename: `${basename}.yaml`,
          content: resource,
        };
      }
    });
  }

  /**
   * This method differ from {@link saveIntoMachine} it aims to update a single Quadlet file.
   * @param options the options.quadlet cannot contain mutliple resources.
   */
  async updateIntoMachine(options: {
    quadlet: string;
    path: string; // path to the quadlet file
    provider: ProviderContainerConnection;
    /**
     * @default false (Run as systemd user)
     */
    admin?: boolean;
  }): Promise<void> {
    const telemetry: Record<string, unknown> = {
      admin: options.admin,
    };
    return this.dependencies.window
      .withProgress(
        {
          title: `Updating ${options.path}`,
          location: ProgressLocation.TASK_WIDGET,
        },
        async () => {
          // extract the quadlet type using extension path (E.g. path=hello/world.pod => pod)
          const split = basename(options.path).split('.');
          if (split.length > 1) {
            telemetry['quadlet-type'] = split[split.length - 1];
          }

          // 1. save the quadlet
          try {
            console.debug(`[QuadletService] updating quadlet file to ${options.path}`);
            await this.dependencies.podman.writeTextFile(options.provider, options.path, options.quadlet);
          } catch (err: unknown) {
            console.error(`Something went wrong while trying to write file to ${options.path}`, err);
            throw err;
          }

          // 2. reload
          await this.dependencies.systemd.daemonReload({
            admin: options.admin ?? false,
            provider: options.provider,
          });

          //3. collect quadlets
          await this.collectPodmanQuadlet();
        },
      )
      .catch((err: unknown) => {
        telemetry['error'] = err;
        throw err;
      })
      .finally(() => {
        this.logUsage(TelemetryEvents.QUADLET_UPDATE, telemetry);
      });
  }

  /**
   * This method differ from {@link updateIntoMachine} it aims to create a new Quadlet file
   * @param options The options.quadlet can contain multiple resources.
   */
  async saveIntoMachine(options: {
    quadlet: string;
    name: string; // name of the quadlet file E.g. `example.container`
    provider: ProviderContainerConnection;
    /**
     * @default false (Run as systemd user)
     */
    admin?: boolean;
  }): Promise<void> {
    const telemetry: Record<string, unknown> = {
      admin: options.admin,
    };
    return this.dependencies.window
      .withProgress(
        {
          title: `Saving ${options.name} quadlet`,
          location: ProgressLocation.TASK_WIDGET,
        },
        async () => {
          // 0. detect all resources
          const resources = this.splitResources(options.name, options.quadlet);
          console.debug(`saving into machine: found ${resources.length} resources`);
          telemetry['resources-length'] = resources.length;

          // for each resource
          for (const resource of resources) {
            // keep track of the type we create
            if (resource.type) {
              const key = `quadlet-${resource.type.toLowerCase()}`;
              telemetry[key] = (typeof telemetry[key] !== 'number' ? 0 : telemetry[key]) + 1;
            }

            // 1. write the file into the podman machine
            let destination: string;
            if (options.admin) {
              destination = joinposix('/etc/containers/systemd/', resource.filename);
            } else {
              destination = joinposix(this.dependencies.configuration.getUnitPath(), resource.filename);
            }

            // 2. write the file
            try {
              console.debug(`[QuadletService] writing quadlet file to ${destination}`);
              await this.dependencies.podman.writeTextFile(options.provider, destination, resource.content);
            } catch (err: unknown) {
              console.error(`Something went wrong while trying to write file to ${destination}`, err);
              throw err;
            }
          }

          // 3. reload
          await this.dependencies.systemd.daemonReload({
            admin: options.admin ?? false,
            provider: options.provider,
          });

          //4. collect quadlets
          await this.collectPodmanQuadlet();
        },
      )
      .catch((err: unknown) => {
        telemetry['error'] = err;
        throw err;
      })
      .finally(() => {
        this.logUsage(TelemetryEvents.QUADLET_CREATE, telemetry);
      });
  }

  async remove(options: {
    ids: string[];
    provider: ProviderContainerConnection;
    /**
     * @default false (Run as systemd user)
     */
    admin?: boolean;
  }): Promise<void> {
    if (options.ids.length === 0) throw new Error('cannot delete zero quadlets.');

    const telemetry: Record<string, unknown> = {
      admin: options.admin,
    };

    // title depends on the number of quadlets
    const title: string =
      options.ids.length === 1 ? `Removing quadlet ${options.ids[0]}` : `Removing ${options.ids.length} quadlets`;
    return this.dependencies.window
      .withProgress(
        {
          title: title,
          location: ProgressLocation.TASK_WIDGET,
        },
        async progress => {
          // get quadlets
          const quadlets = this.getQuadlets(options);

          // mark as deleting
          quadlets.forEach(quadlet => (quadlet.state = 'deleting'));
          this.notify();

          // for each quadlet to delete
          for (const [index, quadlet] of quadlets.entries()) {
            if (quadlets.length > 1) {
              progress.report({
                message: `Removing ${quadlet.id} (${index + 1}/${quadlets.length}).`,
              });
            }

            // extract the quadlet type using extension path (E.g. path=hello/world.pod => pod)
            const split = basename(quadlet.path).split('.');
            if (split.length > 1) {
              telemetry['quadlet-type'] = split[split.length - 1];
            }

            // 1. remove the quadlet file
            console.debug(`[QuadletService] Deleting quadlet ${quadlet.id} with path ${quadlet.path}`);
            await this.dependencies.podman.rmFile(options.provider, quadlet.path);

            // 2. remove the deleted quadlet from the entries
            this.removeEntry({
              provider: options.provider,
              id: quadlet.id,
            });
          }

          // finalize message
          if (quadlets.length > 1) {
            progress.report({ message: `Removed ${quadlets.length} quadlets.` });
          } else {
            progress.report({ message: `Removed quadlet ${quadlets[0].id}.` });
          }

          // 3. reload systemctl
          console.debug(`[QuadletService] Reloading systemctl`);
          await this.dependencies.systemd.daemonReload({
            admin: options.admin ?? false,
            provider: options.provider,
          });
        },
      )
      .catch((err: unknown) => {
        console.error(err);
        telemetry['error'] = err;
        // refresh async in case of issue
        this.collectPodmanQuadlet().catch(console.error);
        // propagate error
        throw err;
      })
      .finally(() => {
        this.logUsage(TelemetryEvents.QUADLET_REMOVE, telemetry);
      });
  }

  /**
   * read the source of the given quadlet
   * @param options
   */
  async read(options: {
    id: string;
    provider: ProviderContainerConnection;
    /**
     * @default false (Run as systemd user)
     */
    admin?: boolean;
  }): Promise<string> {
    const quadlet = this.findQuadlet({
      provider: options.provider,
      id: options.id,
    });
    if (!quadlet) throw new Error(`quadlet with id ${options.id} not found`);

    return await this.dependencies.podman.readTextFile(options.provider, quadlet.path);
  }

  getSynchronisationInfo(): SynchronisationInfo[] {
    return Array.from(this.#synchronisation.entries()).map(([symbol, timestamp]) => ({
      connection: this.fromSymbol(symbol),
      timestamp: timestamp,
    }));
  }

  dispose(): void {
    this.#value.clear();
    this.#extensionsEventDisposable?.dispose();
    this.#extensionsEventDisposable = undefined;
  }
}
