/**
 * @author axel7083
 */
import type { ProviderContainerConnectionIdentifierInfo, SimpleImageInfo } from '@quadlet/core-api';
import { ImageApi } from '@quadlet/core-api';
import type { ImageService } from '../services/image-service';

interface Dependencies {
  images: ImageService;
}

export class ImageApiImpl extends ImageApi {
  constructor(protected dependencies: Dependencies) {
    super();
  }

  override async all(provider: ProviderContainerConnectionIdentifierInfo): Promise<SimpleImageInfo[]> {
    return this.dependencies.images.all(provider);
  }
}
