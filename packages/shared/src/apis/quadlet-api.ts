/**
 * @author axel7083
 */
import type { QuadletInfo } from '../models/quadlet-info';
import type { ProviderContainerConnectionIdentifierInfo } from '../models/provider-container-connection-identifier-info';
import type { QuadletCheck } from '../models/quadlet-check';

export abstract class QuadletApi {
  static readonly CHANNEL: string = 'quadlet-api';

  abstract all(): Promise<QuadletInfo[]>;
  abstract refresh(): Promise<void>;
  abstract start(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean>;
  abstract stop(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean>;
  abstract remove(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<void>;
  abstract read(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<string>;

  abstract createLogger(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    quadletId: string;
  }): Promise<string>;
  abstract disposeLogger(loggerId: string): Promise<void>;

  abstract validate(content: string): Promise<QuadletCheck[]>;

  abstract saveIntoMachine(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    quadlet: string; // content
    name: string; // filename
  }): Promise<void>;

  abstract updateIntoMachine(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    quadlet: string; // content
    path: string;
  }): Promise<void>;
}
