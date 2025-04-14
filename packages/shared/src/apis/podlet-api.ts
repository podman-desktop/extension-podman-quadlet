/**
 * @author axel7083
 */
import type { ProviderContainerConnectionIdentifierInfo } from '../models/provider-container-connection-identifier-info';
import type { QuadletType, QuadletTypeGenerate } from '../utils/quadlet-type';

export abstract class PodletApi {
  static readonly CHANNEL: string = 'podlet-api';

  abstract generate(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    type: QuadletTypeGenerate;
    resourceId: string;
  }): Promise<string>;

  abstract compose(options: {
    filepath: string;
    type: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD;
  }): Promise<string>;
}
