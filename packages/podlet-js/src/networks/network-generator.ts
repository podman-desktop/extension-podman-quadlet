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
import { stringify } from 'js-ini';
import type { NetworkQuadlet } from '../models/network-quadlet';
import type { NetworkInspectInfo } from '@podman-desktop/api';

interface Dependencies {
  network: NetworkInspectInfo;
}

export class NetworkGenerator extends Generator<Dependencies> {
  override generate(): string {
    const quadlet: NetworkQuadlet = {
      Network: {
        NetworkName: this.dependencies.network.Name,
      },
    };

    if (this.dependencies.network.Internal) {
      quadlet.Network.Internal = true;
    }

    if (this.dependencies.network.Labels) {
      quadlet.Network.Label = Object.entries(this.dependencies.network.Labels).map(([key, value]) => `${key}=${value}`);
    }

    return stringify(this.format(quadlet));
  }
}
