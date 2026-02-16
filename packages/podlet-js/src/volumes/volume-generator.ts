/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
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
import type { VolumeInfo } from '@podman-desktop/api';
import { stringify } from 'js-ini';
import type { VolumeQuadlet } from '../models/volume-quadlet';

interface Dependencies {
  volume: VolumeInfo;
}

export class VolumeGenerator extends Generator<Dependencies> {
  override generate(): string {
    const volume: VolumeQuadlet = {
      Volume: {
        VolumeName: this.dependencies.volume.Name,
      },
    };

    switch (this.dependencies.volume.Driver) {
      case 'local':
        break; // do nothing local is the default
      case 'image':
        if (!this.dependencies.volume.Options?.['image'])
          throw new Error('driver image must have corresponding image option');

        volume.Volume.Driver = 'image';
        volume.Volume.Image = this.dependencies.volume.Options?.['image'];
        break;
      default:
        console.warn(`unrecognized driver: ${this.dependencies.volume.Driver}`);
        volume.Volume.Driver = this.dependencies.volume.Driver;
    }

    if (this.dependencies.volume.Labels) {
      const labels = Object.entries(this.dependencies.volume.Labels).map(([key, value]) => `${key}=${value}`);
      if (labels.length > 0) {
        volume.Volume.Label = labels;
      }
    }

    if (this.dependencies.volume.Options) {
      const options = this.dependencies.volume.Options;
      if (options['device']) {
        volume.Volume.Device = options['device'];
      }
      if (options['o']) {
        volume.Volume.Options = options['o'];
      }
      if (options['type']) {
        volume.Volume.Type = options['type'];
      }
      if (options['copy'] === 'true' || options['copy'] === '1') {
        volume.Volume.Copy = true;
      }
    }

    return stringify(this.format(volume));
  }
}
