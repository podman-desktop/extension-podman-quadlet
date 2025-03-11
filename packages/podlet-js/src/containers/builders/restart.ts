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
import type { ContainerQuadlet } from '../../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';
import type { HostRestartPolicy } from '@podman-desktop/api';
import type { ServiceRestartPolicy } from '../../models/service-quadlet';

/**
 * Detect if user used `--restart` option
 */
export class Restart extends ContainerQuadletBuilder {
  private getCorresponding(policy: HostRestartPolicy): ServiceRestartPolicy {
    switch (policy.Name) {
      case 'always':
      case 'unless-stopped':
        return 'always';
      case 'no':
      case 'never':
        return 'no';
    }
    throw new Error(
      `cannot generate systemd restart policy from the container host config: unknown policy ${policy.Name}`,
    );
  }

  override build(from: ContainerQuadlet): ContainerQuadlet {
    // If we have a restart policy and is not the default no
    if (this.container.HostConfig.RestartPolicy && this.container.HostConfig.RestartPolicy.Name !== 'no') {
      from.Service = {
        ...from.Service,
        Restart: this.getCorresponding(this.container.HostConfig.RestartPolicy),
      };
    }
    return from;
  }
}
