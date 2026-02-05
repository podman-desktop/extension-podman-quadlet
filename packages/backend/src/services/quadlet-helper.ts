/**
 * @author axel7083
 */
import type { env, TelemetryLogger, Webview, window } from '@podman-desktop/api';
import { Publisher } from '../utils/publisher';
import type {
  QuadletInfo,
  ProviderContainerConnectionIdentifierInfo,
} from '@podman-desktop/quadlet-extension-core-api';
import { Messages } from '@podman-desktop/quadlet-extension-core-api';
import type { PodmanService } from './podman-service';
import type { SystemdService } from './systemd-service';
import type { ProviderService } from './provider-service';

export interface QuadletServiceDependencies {
  providers: ProviderService;
  env: typeof env;
  webview: Webview;
  podman: PodmanService;
  systemd: SystemdService;
  window: typeof window;
  telemetry: TelemetryLogger;
}

type ProviderIdentifier = `${string}:${string}`;

export abstract class QuadletHelper extends Publisher<QuadletInfo[]> {
  #symbols: Map<ProviderIdentifier, symbol>;

  protected constructor(protected dependencies: QuadletServiceDependencies) {
    super(dependencies.webview, Messages.UPDATE_QUADLETS, () => this.all());
    this.#symbols = new Map<ProviderIdentifier, symbol>();
  }

  abstract all(): QuadletInfo[];

  protected get providers(): ProviderService {
    return this.dependencies.providers;
  }

  protected logUsage(eventName: string, data?: Record<string, unknown>): void {
    return this.dependencies.telemetry.logUsage(eventName, data);
  }

  protected get podman(): PodmanService {
    return this.dependencies.podman;
  }

  protected fromSymbol(symbol: symbol): ProviderContainerConnectionIdentifierInfo {
    const result = Array.from(this.#symbols.entries()).find(([_, value]) => value === symbol);
    if (!result) throw new Error(`cannot found corresponding provider connection for symbol ${symbol.toString()}`);
    const [providerId, connection] = result[0].split(':');
    return {
      providerId: providerId,
      name: connection,
    };
  }

  protected getSymbol(connection: { providerId: string; connection: { name: string } }): symbol {
    const key: ProviderIdentifier = `${connection.providerId}:${connection.connection.name}`;
    let symbol: symbol | undefined = this.#symbols.get(key);
    if (!symbol) {
      symbol = Symbol(key);
      this.#symbols.set(key, symbol);
    }
    return symbol;
  }
}
