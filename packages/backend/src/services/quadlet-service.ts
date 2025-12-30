/**
 * @author axel7083
 */

import { ProgressLocation } from '@podman-desktop/api';
import type { Disposable, ProviderContainerConnection, CancellationToken } from '@podman-desktop/api';
import type { QuadletServiceDependencies } from './quadlet-helper';
import { QuadletHelper } from './quadlet-helper';
import { QuadletDryRunParser } from '../utils/parsers/quadlet-dryrun-parser';
import type { Quadlet } from '/@shared/src/models/quadlet';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import type { AsyncInit } from '../utils/async-init';
import { join as joinposix, basename, dirname, isAbsolute } from 'node:path/posix';
import type { SynchronisationInfo } from '/@shared/src/models/synchronisation';
import { TelemetryEvents } from '../utils/telemetry-events';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import { QuadletKubeParser } from '../utils/parsers/quadlet-kube-parser';
import { isRunError } from '../utils/run-error';
import templates from '../assets/templates.json';
import type { Template } from '/@shared/src/models/template';
import type { PodmanWorker } from '../utils/worker/podman-worker';
import type { ServiceQuadlet } from '/@shared/src/models/service-quadlet';
import { isServiceQuadlet } from '/@shared/src/models/service-quadlet';
import { isTemplateQuadlet } from '/@shared/src/models/template-quadlet';

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
   * Get a {@link Quadlet} object given an id.
   * @remarks throw an error if the quadlet does not exist
   * @param quadletId
   */
  public getQuadlet(quadletId: string): Quadlet {
    for (const quadlets of this.#value.values()) {
      const result = quadlets.find(quadlet => quadlet.id === quadletId);
      if (result) return result;
    }
    throw new Error(`cannot found quadlet with id ${quadletId}`);
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
   * @param options
   */
  protected async getQuadletVersion(
    provider: ProviderContainerConnection,
    options?: { token?: CancellationToken },
  ): Promise<string> {
    // Get the worker
    const worker: PodmanWorker = await this.podman.getWorker(provider);

    const result = await worker.quadletExec({
      args: ['-version'],
      token: options?.token,
    });
    if (isRunError(result)) throw new Error(`cannot get quadlet version (${result.exitCode}): ${result.stderr}`);
    return result.stdout;
  }

  protected async getPodmanQuadlets(options: {
    provider: ProviderContainerConnection;
    token?: CancellationToken;
    /**
     * @default false (Run as systemd user)
     */
    admin?: boolean;
  }): Promise<Quadlet[]> {
    const args: string[] = ['-dryrun'];
    if (!options.admin) {
      args.push('-user');
    }

    // Get the worker
    const worker: PodmanWorker = await this.podman.getWorker(options.provider);

    const result = await worker.quadletExec({
      args,
      token: options.token,
    });

    if (isRunError(result)) {
      console.warn(`quadlet exec exit with code ${result.exitCode}`, result.stderr);
    }

    const parser = new QuadletDryRunParser(result);
    return parser.parse();
  }

  async collectPodmanQuadlet(): Promise<void> {
    this.#value.clear();

    const telemetry: Record<string, unknown> = {};

    // wrap in a Task
    return this.dependencies.window
      .withProgress(
        {
          title: 'Collecting quadlets',
          location: ProgressLocation.TASK_WIDGET,
          cancellable: true,
        },
        async (progress, token): Promise<void> => {
          const containerProviders: ProviderContainerConnection[] = this.providers
            .getContainerConnections()
            // only care about started podman connection
            .filter(provider => provider.connection.type === 'podman' && provider.connection.status() === 'started');
          console.log(`[QuadletService] collectPodmanQuadlet found ${containerProviders.length} connections`);

          telemetry['connections-length'] = containerProviders.length;

          for (const provider of containerProviders) {
            if (token.isCancellationRequested) return;

            // set current message
            progress.report({
              message: `Collecting quadlets ${provider.connection.name}`,
            });

            // 1. get the quadlets
            const quadlets = await this.getPodmanQuadlets({ provider, token, admin: false });

            // 2. update internally but do not notify (we need to collect the statuses)
            this.update(provider, quadlets, false);

            // 3. Refresh the status if some quadlets are found
            if (quadlets.length > 0) {
              await this.refreshQuadletsStatuses(false);
            }

            // increment progress
            progress.report({
              increment: 100 / containerProviders.length,
            });
          }

          progress.report({ message: 'Collecting quadlets completed.' });
        },
      )
      .catch((err: unknown) => {
        telemetry['error'] = err;
        throw err;
      })
      .finally(() => {
        // notify completion
        this.dependencies.telemetry.logUsage(TelemetryEvents.QUADLET_COLLECT, telemetry);
        this.notify();
      });
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
   * @remarks only refresh the statuses of ***known** quadlets with associate service name, do not catch new ones.
   * todo: optimise ? paralele ?
   */
  async refreshQuadletsStatuses(notify = true): Promise<void> {
    for (const [symbol, quadlets] of Array.from(this.#value.entries())) {
      // retrieve the provider from the symbol
      const providerIdentifier = this.fromSymbol(symbol);
      const provider = this.providers.getProviderContainerConnection(providerIdentifier);

      const serviceQuadlets: Array<ServiceQuadlet> = quadlets
        // filter service quadlet and filter out template quadlet
        .filter((quadlet): quadlet is ServiceQuadlet => isServiceQuadlet(quadlet) && !isTemplateQuadlet(quadlet));

      // get the statuses of the quadlets with a corresponding service
      const statuses = await this.dependencies.systemd.getActiveStatus({
        provider: provider,
        admin: false,
        services: serviceQuadlets.map(quadlet => quadlet.service),
      });

      // update each quadlets
      for (const quadlet of serviceQuadlets) {
        // skip quadlet without associated service
        if (!quadlet.service) continue;

        // only update service we have information about
        if (quadlet.service in statuses) {
          quadlet.state = statuses[quadlet.service] ? 'active' : 'inactive';
        }
      }

      this.update(provider, quadlets, notify);
    }
  }

  /**
   * @param options
   */
  async writeIntoMachine(options: {
    provider: ProviderContainerConnection;
    /**
     * @default false (Run as systemd user)
     */
    admin?: boolean;
    files: Array<{ filename: string; content: string }>;
    /**
     * When writing to the machine, by default the code will call systemd daemon-reload
     * @default false
     */
    skipSystemdDaemonReload?: boolean;
  }): Promise<void> {
    const telemetry: Record<string, unknown> = {
      admin: options.admin,
    };

    // note the number of files we update
    telemetry['files-length'] = options.files.length;

    // create a progress task
    return this.dependencies.window
      .withProgress(
        {
          title: `Saving`,
          location: ProgressLocation.TASK_WIDGET,
        },
        async () => {
          // Get the worker
          const worker: PodmanWorker = await this.podman.getWorker(options.provider);

          // write all files sequentially - do not try to run them in parallel
          for (const { filename, content } of options.files) {
            let destination: string;
            if (isAbsolute(filename) || filename.startsWith('~/')) {
              destination = filename;
            } else {
              if (options.admin) {
                destination = joinposix('/etc/containers/systemd', filename);
              } else {
                destination = joinposix('~/.config/containers/systemd', filename);
              }
            }

            // basic name validation
            const base = basename(destination);
            if (base.length === 0) throw new Error('invalid filename: empty name not allowed');
            if (!base.includes('.')) throw new Error('invalid filename: file without extension are not allowed');

            // write the file
            try {
              await worker.write(destination, content);
            } catch (err: unknown) {
              console.error(`Something went wrong while trying to write file to ${destination}`, err);
              throw err;
            }
          }

          if (!options.skipSystemdDaemonReload) {
            // reload
            await this.dependencies.systemd.daemonReload({
              admin: options.admin ?? false,
              provider: options.provider,
            });

            // collect quadlets
            await this.collectPodmanQuadlet();
          }
        },
      )
      .catch((err: unknown) => {
        telemetry['error'] = err;
        throw err;
      })
      .finally(() => {
        this.logUsage(TelemetryEvents.QUADLET_WRITE, telemetry);
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
          // Get the worker
          const worker: PodmanWorker = await this.podman.getWorker(options.provider);

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
            await worker.rm(quadlet.path);

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

    // Get the worker
    const worker: PodmanWorker = await this.podman.getWorker(options.provider);
    return await worker.read(quadlet.path);
  }

  getSynchronisationInfo(): SynchronisationInfo[] {
    return Array.from(this.#synchronisation.entries()).map(([symbol, timestamp]) => ({
      connection: this.fromSymbol(symbol),
      timestamp: timestamp,
    }));
  }

  async getKubeYAML(options: { id: string; provider: ProviderContainerConnection }): Promise<{
    content: string;
    path: string;
  }> {
    const quadlet = this.findQuadlet({
      provider: options.provider,
      id: options.id,
    });
    if (!quadlet) throw new Error(`quadlet with id ${options.id} not found`);

    // assert quadlet type is kube.
    if (quadlet.type !== QuadletType.KUBE)
      throw new Error(`cannot get kube yaml of non-kube quadlet: quadlet ${quadlet.id} type is ${quadlet.type}`);

    if (!isServiceQuadlet(quadlet))
      throw new Error('cannot get kube yaml: quadlet without associated systemd service cannot be parsed.');

    // extract the yaml file from
    const { yaml } = new QuadletKubeParser(quadlet.content).parse();

    // found the absolute path of the yaml
    // the documentation says "The path, absolute or relative to the location of the unit file, to the Kubernetes YAML file to use."
    let target: string;
    if (isAbsolute(yaml)) {
      target = yaml;
    } else {
      target = joinposix(dirname(quadlet.path), yaml);
    }

    // some security, only allow to read yaml / yml files.
    if (!target.endsWith('.yaml') && !target.endsWith('.yml')) {
      throw new Error(`quadlet ${quadlet.id} declared yaml file ${target}: invalid file format.`);
    }

    try {
      // Get the worker
      const worker: PodmanWorker = await this.podman.getWorker(options.provider);
      const content = await worker.read(target);
      return {
        content: content,
        path: target,
      };
    } catch (err: unknown) {
      console.error(`Something went wrong with readTextFile on ${target}`, err);
      // check err is an RunError
      if (!err || typeof err !== 'object' || !('exitCode' in err) || !('stderr' in err)) {
        throw err;
      }
      throw new Error(`cannot read ${target}: ${err.stderr}`);
    }
  }

  override dispose(): void {
    super.dispose();
    this.#value.clear();
    this.#extensionsEventDisposable?.dispose();
    this.#extensionsEventDisposable = undefined;
  }

  public templates(): Array<Template> {
    return templates;
  }
}
