/**
 * @author axel7083
 */

export interface Quadlet {
  id: string;
  path: string;
  // raw content of the service file
  content: string;
  state: 'active' | 'inactive' | 'deleting' | 'unknown';
}
