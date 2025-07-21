/**
 * @author axel7083
 */

import type { QuadletType } from '../utils/quadlet-type';

export type QuadletState = 'active' | 'inactive' | 'deleting' | 'unknown' | 'error';

export interface Quadlet {
  /**
   * UUID to internally identify the quadlet
   * @remarks the id is not persisted
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
   * @remarks this may be undefined if no associated systemd could be found
   */
  content?: string;
  /**
   * State of the quadlet
   */
  state: QuadletState;
  /**
   * quadlet have a type based on their extension (.container, .image etc.)
   */
  type: QuadletType;
  /**
   * quadlet can depend on other services (which may be also quadlets)
   * @remarks the string are the service name, not the quadlet ids.
   */
  requires: Array<string>;
}
