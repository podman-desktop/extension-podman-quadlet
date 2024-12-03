/**
 * @author axel7083
 */
import type { QuadletInfo } from '../models/quadlet-info';
import type { ProviderContainerConnectionIdentifierInfo } from '../models/provider-container-connection-identifier-info';

export abstract class QuadletApi {
  static readonly CHANNEL: string = 'quadlet-api';

  abstract all(): Promise<QuadletInfo[]>;
  abstract refresh(): Promise<void>;
  abstract start(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean>;
  abstract stop(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean>;
}