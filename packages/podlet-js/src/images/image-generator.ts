/**********************************************************************
 * Copyright (C) 2025 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/
import { Generator } from '../utils/generator';
import type { ImageInspectInfo } from '@podman-desktop/api';
import { stringify } from 'js-ini';
import type { ImageQuadlet } from '../models/image-quadlet';
import type { QuadletSection } from '../models/quadlet-section';

interface Dependencies {
  image: ImageInspectInfo;
  quadlet?: QuadletSection;
}

export class ImageGenerator extends Generator<Dependencies> {
  override generate(): string {
    if (this.dependencies.image.RepoTags.length === 0) throw new Error('image selected does not have any repo tags.');

    const image: ImageQuadlet = {
      Image: {
        Arch: this.dependencies.image.Architecture,
        OS: this.dependencies.image.Os,
        Image: this.dependencies.image.RepoTags[0],
      },
    };

    // user may specify a quadlet section
    if (this.dependencies.quadlet) {
      image.Quadlet = this.dependencies.quadlet;
    }

    return stringify(this.format(image));
  }
}
