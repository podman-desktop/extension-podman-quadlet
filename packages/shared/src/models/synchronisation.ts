import type { ProviderContainerConnectionIdentifierInfo } from './provider-container-connection-identifier-info';

export interface SynchronisationInfo {
  connection: ProviderContainerConnectionIdentifierInfo;
  timestamp?: number;
}
