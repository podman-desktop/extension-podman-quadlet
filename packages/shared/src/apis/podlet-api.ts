/**********************************************************************
 * Copyright (C) 2025-2026 Red Hat, Inc.
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
import type { ProviderContainerConnectionIdentifierInfo } from '../models/provider-container-connection-identifier-info';
import type { QuadletType } from '../utils/quadlet-type';

export abstract class PodletApi {
  static readonly CHANNEL: string = 'podlet-api';

  abstract generateContainer(
    connection: ProviderContainerConnectionIdentifierInfo,
    containerId: string,
  ): Promise<string>;
  abstract generateImage(connection: ProviderContainerConnectionIdentifierInfo, imageId: string): Promise<string>;
  abstract generatePod(connection: ProviderContainerConnectionIdentifierInfo, podId: string): Promise<string>;
  abstract generateVolume(connection: ProviderContainerConnectionIdentifierInfo, volumeId: string): Promise<string>;
  abstract generateNetwork(connection: ProviderContainerConnectionIdentifierInfo, networkId: string): Promise<string>;

  abstract compose(options: {
    filepath: string;
    type: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD;
  }): Promise<string>;
}
