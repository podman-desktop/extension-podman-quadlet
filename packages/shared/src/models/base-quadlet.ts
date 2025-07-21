/**
 * @author axel7083
 */

import type { QuadletType } from '../utils/quadlet-type';

export type QuadletState = 'active' | 'inactive' | 'deleting' | 'unknown' | 'error';

export interface BaseQuadlet {
  /**
   * UUID to internally identify the quadlet
   * @remarks the id is not persisted
   */
  id: string;
  /**
   * path to the quadlet file
   * @example "~/.config/containers/systemd/foo.container"
   */
  path: string;
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
