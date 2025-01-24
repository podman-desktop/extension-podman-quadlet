/**
 * @author axel7083
 */
import type { ProviderContainerConnectionIdentifierInfo } from './provider-container-connection-identifier-info';

export interface QuadletInfo {
  id: string;
  // absolute path in the machine
  path: string;
  state: 'active' | 'inactive' | 'deleting' | 'unknown';

  // raw content of the service file
  content: string;
  // the connection linked
  connection: ProviderContainerConnectionIdentifierInfo;
}
