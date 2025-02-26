/**
 * @author axel7083
 */
import type { ProviderContainerConnectionIdentifierInfo } from './provider-container-connection-identifier-info';
import type { QuadletType } from '../utils/quadlet-type';

export type QuadletState = 'active' | 'inactive' | 'deleting' | 'unknown' | 'error';

export interface QuadletInfo {
  /**
   * UUID to internally identify the quadlet
   * @remarks the id is not persisted between reboot
   */
  id: string;
  /**
   * systemd service name
   * @remarks may be undefined if the quadlet is invalid
   */
  service?: string;
  /**
   * path to the quadlet file
   * @example "~/.config/containers/systemd/foo.container"
   */
  path: string;
  /**
   * raw content (generate) of the service file
   */
  content: string;
  /**
   * State of the quadlet
   */
  state: QuadletState;
  /**
   * Associate connection to the quadlet
   */
  connection: ProviderContainerConnectionIdentifierInfo;
  /**
   * quadlet have a type based on their extension (.container, .image etc.)
   */
  type: QuadletType;
}
