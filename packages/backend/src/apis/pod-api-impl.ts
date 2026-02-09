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
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { PodApi } from '/@shared/src/apis/pod-api';
import type { SimplePodInfo } from '/@shared/src/models/simple-pod-info';
import type { PodService } from '../services/pod-service';

interface Dependencies {
  pods: PodService;
}

export class PodApiImpl extends PodApi {
  constructor(protected dependencies: Dependencies) {
    super();
  }

  override async all(provider: ProviderContainerConnectionIdentifierInfo): Promise<Array<SimplePodInfo>> {
    return this.dependencies.pods.all(provider);
  }
}
