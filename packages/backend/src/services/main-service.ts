/**
 * @author axel7083
 */
import type {
  Disposable,
  env,
  ExtensionContext,
  extensions,
  process as processApi,
  commands as commandsApi,
  provider,
  window,
  configuration as configurationAPI,
  cli as cliApi,
  containerEngine,
  TelemetryLogger,
} from '@podman-desktop/api';
import { WebviewService } from './webview-service';
import {
  RpcExtension,
  QuadletApi,
  ProviderApi,
  RoutingApi,
  ContainerApi,
  PodletApi,
  ImageApi,
  LoggerApi,
  DialogApi,
  ConfigurationApi,
  PodApi,
  VolumeApi,
  NetworkApi,
} from '@podman-desktop/quadlet-extension-core-api';
import { PodmanService } from './podman-service';
import { SystemdService } from './systemd-service';
import { QuadletService } from './quadlet-service';
import { QuadletApiImpl } from '../apis/quadlet-api-impl';
import type { AsyncInit } from '../utils/async-init';
import { ProviderApiImpl } from '../apis/provider-api-impl';
import { ProviderService } from './provider-service';
import { CommandService } from './command-service';
import { RoutingService } from './routing-service';
import { RoutingApiImpl } from '../apis/routing-api-impl';
import { ContainerService } from './container-service';
import { ContainerApiImpl } from '../apis/container-api-impl';
import { PodletApiImpl } from '../apis/podlet-api-impl';
import { ImageApiImpl } from '../apis/image-api-impl';
import { ImageService } from './image-service';
import { LoggerService } from './logger-service';
import { LoggerApiImpl } from '../apis/logger-api-impl';
import { DialogService } from './dialog-service';
import { DialogApiImpl } from '../apis/dialog-api-impl';
import { PodletJsService } from './podlet-js-service';
import { ConfigurationService } from './configuration-service';
import { ConfigurationApiImpl } from '../apis/configuration-api-impl';
import { PodApiImpl } from '../apis/pod-api-impl';
import { VolumeApiImpl } from '../apis/volume-api-impl';
import { PodService } from './pod-service';
import { VolumeService } from './volume-service';
import { NetworkApiImpl } from '../apis/network-api-impl';
import { NetworkService } from './network-service';

interface Dependencies {
  extensionContext: ExtensionContext;
  window: typeof window;
  env: typeof env;
  extensions: typeof extensions;
  processApi: typeof processApi;
  providers: typeof provider;
  cliApi: typeof cliApi;
  commandsApi: typeof commandsApi;
  containers: typeof containerEngine;
  configuration: typeof configurationAPI;
}

export class MainService implements Disposable, AsyncInit {
  readonly #disposables: Disposable[] = [];
  readonly #telemetry: TelemetryLogger;

  constructor(private dependencies: Dependencies) {
    this.#telemetry = dependencies.env.createTelemetryLogger();
  }

  dispose(): void {
    this.#disposables.forEach(disposable => disposable.dispose());
    this.#telemetry.dispose();
  }

  async init(): Promise<void> {
    /**
     * Creating and init Services
     */
    // init webview
    const webview = new WebviewService({
      extensionUri: this.dependencies.extensionContext.extensionUri,
      window: this.dependencies.window,
    });
    await webview.init();
    this.#disposables.push(webview);

    // Configuration service
    const configuration = new ConfigurationService({
      configurationAPI: this.dependencies.configuration,
    });
    this.#disposables.push(configuration);

    // logger service store logs and publish them to the frontend
    const loggerService = new LoggerService({
      webview: webview.getPanel().webview,
    });
    this.#disposables.push(loggerService);

    // dialog service
    const dialog = new DialogService({
      windowApi: this.dependencies.window,
    });

    // init IPC system
    const rpcExtension = new RpcExtension(webview.getPanel().webview);
    rpcExtension.init();
    this.#disposables.push(rpcExtension);

    // routing service
    const routing = new RoutingService({
      panel: webview.getPanel(),
    });
    await routing.init();
    this.#disposables.push(routing);

    // The provider service register subscribers events for provider updates
    const providers = new ProviderService({
      providers: this.dependencies.providers,
      webview: webview.getPanel().webview,
    });
    await providers.init();
    this.#disposables.push(providers);

    // Basic manipulate of containers
    const containers = new ContainerService({
      containers: this.dependencies.containers,
      providers: providers,
    });
    await containers.init();
    this.#disposables.push(containers);

    // The Podman Service is responsible for communicating with the podman extension
    const podman = new PodmanService({
      env: this.dependencies.env,
      extensions: this.dependencies.extensions,
      processApi: this.dependencies.processApi,
      providers: providers,
    });
    await podman.init();
    this.#disposables.push(podman);

    // systemd service is responsible for communicating with the systemd in the podman machine
    const systemd = new SystemdService({
      podman,
      telemetry: this.#telemetry,
    });
    await systemd.init();
    this.#disposables.push(systemd);

    // quadlet service is responsible for interacting with the Quadlet CLI
    const quadletService = new QuadletService({
      systemd,
      podman,
      webview: webview.getPanel().webview,
      env: this.dependencies.env,
      providers: providers,
      window: this.dependencies.window,
      telemetry: this.#telemetry,
    });
    await quadletService.init();
    this.#disposables.push(quadletService);

    // Basic manipulation of images
    const images = new ImageService({
      containers: this.dependencies.containers,
      providers: providers,
    });
    await images.init();
    this.#disposables.push(images);

    // Basic manipulation of pods
    const pods = new PodService({
      containers: this.dependencies.containers,
      providers: providers,
      containerService: containers,
    });
    await pods.init();
    this.#disposables.push(pods);

    // Basic manipulation of volumes
    const volumes = new VolumeService({
      containers: this.dependencies.containers,
      providers: providers,
    });
    await volumes.init();
    this.#disposables.push(volumes);

    // Basic manipulation of networks
    const networks = new NetworkService({
      containers: this.dependencies.containers,
      providers: providers,
    });
    await networks.init();
    this.#disposables.push(networks);

    // Register/execute commands
    const command = new CommandService({
      commandsApi: this.dependencies.commandsApi,
      routing: routing,
      providers: providers,
      containers: containers,
    });
    await command.init();
    this.#disposables.push(command);

    // Replacement of PodletCli
    const podletJS = new PodletJsService({
      containers: containers,
      images: images,
      pods: pods,
      volumes: volumes,
      networks: networks,
      telemetry: this.#telemetry,
      podman: podman,
      providers: providers,
    });

    /**
     * Creating the api for the frontend IPCs
     */

    // quadlet api
    const quadletApiImpl = new QuadletApiImpl({
      quadlet: quadletService,
      systemd: systemd,
      podman: podman,
      providers: providers,
      loggerService: loggerService,
    });
    rpcExtension.registerInstance<QuadletApi>(QuadletApi, quadletApiImpl);

    // logger api
    const loggerServiceApiImpl = new LoggerApiImpl({
      loggerService: loggerService,
    });
    rpcExtension.registerInstance<LoggerApi>(LoggerApi, loggerServiceApiImpl);

    // provider api
    const providerApiImpl = new ProviderApiImpl({
      podman: podman,
      providers: providers,
    });
    rpcExtension.registerInstance<ProviderApi>(ProviderApi, providerApiImpl);

    // container api
    const containerApiImpl = new ContainerApiImpl({
      containers: containers,
    });
    rpcExtension.registerInstance<ContainerApi>(ContainerApi, containerApiImpl);

    // image api
    const imageApiImpl = new ImageApiImpl({
      images: images,
    });
    rpcExtension.registerInstance<ImageApi>(ImageApi, imageApiImpl);

    // pod api
    const podApiImpl = new PodApiImpl({
      pods: pods,
    });
    rpcExtension.registerInstance<PodApi>(PodApi, podApiImpl);

    // volume api
    const volumeApiImpl = new VolumeApiImpl({
      volumes: volumes,
    });
    rpcExtension.registerInstance<VolumeApi>(VolumeApi, volumeApiImpl);

    // network api
    const networkApiImpl = new NetworkApiImpl({
      networks: networks,
    });
    rpcExtension.registerInstance<NetworkApi>(NetworkApi, networkApiImpl);

    // podlet api
    const podletApiImpl = new PodletApiImpl({
      podletJS: podletJS,
    });
    rpcExtension.registerInstance<PodletApi>(PodletApi, podletApiImpl);

    // routing api
    const routingApiImpl = new RoutingApiImpl({
      routing: routing,
    });
    rpcExtension.registerInstance<RoutingApi>(RoutingApi, routingApiImpl);

    // dialog api
    const dialogApiImpl = new DialogApiImpl({
      dialog: dialog,
    });
    rpcExtension.registerInstance<DialogApi>(DialogApi, dialogApiImpl);

    // configuration api
    const configurationApiImpl = new ConfigurationApiImpl({
      configuration: configuration,
    });
    rpcExtension.registerInstance<ConfigurationApi>(ConfigurationApi, configurationApiImpl);
  }
}
