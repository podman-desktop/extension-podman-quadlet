/**
 * @author axel7083
 */
import type { QuadletType } from '/@shared/src/utils/quadlet-type';

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
   */
  content: string;
  /**
   * State of the quadlet
   */
  state: 'active' | 'inactive' | 'deleting' | 'unknown';
  /**
   * quadlet can have multiple type (container, image etc.)
   */
  type: QuadletType;
}
