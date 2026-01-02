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

import type { Disposable, configuration as configurationAPI, Configuration } from '@podman-desktop/api';
import type { CONTAINER_ENGINE_CONNECTION_FORMAT } from '/@shared/src/apis/configuration-api';

interface Dependencies {
  configurationAPI: typeof configurationAPI;
}

export const CONFIGURATION_SECTION = 'podman-quadlet';
export const PREFERRED_CONTAINER_ENGINE_CONNECTION_KEY = 'preferredContainerEngineConnection';

export class ConfigurationService implements Disposable {
  constructor(protected readonly dependencies: Dependencies) {}

  protected get section(): Configuration {
    return this.dependencies.configurationAPI.getConfiguration(CONFIGURATION_SECTION);
  }

  public getPreferredContainerEngineConnection(): CONTAINER_ENGINE_CONNECTION_FORMAT | undefined {
    return this.section.get<CONTAINER_ENGINE_CONNECTION_FORMAT | undefined>(PREFERRED_CONTAINER_ENGINE_CONNECTION_KEY);
  }

  public setPreferredContainerEngineConnection(value: CONTAINER_ENGINE_CONNECTION_FORMAT | undefined): Promise<void> {
    return this.section.update(PREFERRED_CONTAINER_ENGINE_CONNECTION_KEY, value);
  }

  dispose(): void {}
}
