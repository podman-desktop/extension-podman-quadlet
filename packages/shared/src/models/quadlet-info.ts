/**
 * @author axel7083
 */
import type { ProviderContainerConnectionIdentifierInfo } from './provider-container-connection-identifier-info';
import type { Quadlet } from './quadlet';

export interface QuadletInfo extends Quadlet {
  /**
   * Associate connection to the quadlet
   */
  connection: ProviderContainerConnectionIdentifierInfo;
}
