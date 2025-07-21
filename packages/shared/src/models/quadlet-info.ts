/**
 * @author axel7083
 */
import type { NoServiceQuadlet } from './no-service-quadlet';
import type { ProviderContainerConnectionIdentifierInfo } from './provider-container-connection-identifier-info';
import type { ServiceQuadlet } from './service-quadlet';

export type HasConnection = {
  /**
   * Associate connection to the quadlet
   */
  connection: ProviderContainerConnectionIdentifierInfo;
};

export type ServiceQuadletInfo = ServiceQuadlet & HasConnection;
export type NoServiceQuadletInfo = NoServiceQuadlet & HasConnection;

export type QuadletInfo = ServiceQuadletInfo | NoServiceQuadletInfo;
