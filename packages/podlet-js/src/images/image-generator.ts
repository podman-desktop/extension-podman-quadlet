import { Generator } from '../utils/generator';
import type { ImageInspectInfo } from '@podman-desktop/api';
import { stringify } from 'js-ini';
import type { ImageQuadlet } from '../models/image-quadlet';

interface Dependencies {
  image: ImageInspectInfo;
}

export class ImageGenerator extends Generator<Dependencies> {
  override generate(): string {
    if(this.dependencies.image.RepoTags.length === 0) throw new Error('image selected does not have any repo tags.');

    const image: ImageQuadlet = {
      Image: {
        Arch: this.dependencies.image.Architecture,
        OS: this.dependencies.image.Os,
        Image: this.dependencies.image.RepoTags[0],
      },
    };

    return stringify(this.format(image));
  }
}
