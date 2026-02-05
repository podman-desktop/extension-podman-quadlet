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

import type { CONTAINER_ENGINE_CONNECTION_FORMAT } from '@quadlet/core-api';
import { ConfigurationApi } from '@quadlet/core-api';
import type { ConfigurationService } from '../services/configuration-service';

interface Dependencies {
  configuration: ConfigurationService;
}

export class ConfigurationApiImpl extends ConfigurationApi {
  constructor(protected readonly dependencies: Dependencies) {
    super();
  }

  public override async getPreferredContainerEngineConnection(): Promise<
    CONTAINER_ENGINE_CONNECTION_FORMAT | undefined
  > {
    return this.dependencies.configuration.getPreferredContainerEngineConnection();
  }

  public override setPreferredContainerEngineConnection(
    value: CONTAINER_ENGINE_CONNECTION_FORMAT | undefined,
  ): Promise<void> {
    return this.dependencies.configuration.setPreferredContainerEngineConnection(value);
  }
}
