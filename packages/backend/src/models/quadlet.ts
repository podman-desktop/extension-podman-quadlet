/**
 * @author axel7083
 */
import type { QuadletType } from '/@shared/src/utils/quadlet-type';

export interface Quadlet {
  id: string;
  path: string;
  // raw content (generate) of the service file
  content: string;
  state: 'active' | 'inactive' | 'deleting' | 'unknown';
  // type of quadlet
  type: QuadletType;
}
