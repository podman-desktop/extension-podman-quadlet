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

import {
  type SimpleVolumeInfo,
  type ProviderContainerConnectionIdentifierInfo,
  VolumeApi,
} from '@podman-desktop/quadlet-extension-core-api';
import type { VolumeService } from '../services/volume-service';

interface Dependencies {
  volumes: VolumeService;
}

export class VolumeApiImpl extends VolumeApi {
  constructor(private dependencies: Dependencies) {
    super();
  }

  override all(provider: ProviderContainerConnectionIdentifierInfo): Promise<SimpleVolumeInfo[]> {
    return this.dependencies.volumes.all(provider);
  }
}
