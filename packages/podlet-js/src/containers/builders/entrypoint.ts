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

/**
 * Detect if user used `--entrypoint` option (E.g. podman run --entrypoint=/foo.sh hello-world)
 */
export class Entrypoint extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if (this.container.Config.Entrypoint) {
      // if entrypoint is string and is not the same as the image entrypoint => user defined entrypoint
      if (
        typeof this.container.Config.Entrypoint === 'string' &&
        this.container.Config.Entrypoint !== this.image.Config.Entrypoint &&
        this.container.Config.Entrypoint.length
      ) {
        from.Container.Entrypoint = this.container.Config.Entrypoint;
      } else if (
        Array.isArray(this.container.Config.Entrypoint) &&
        this.container.Config.Entrypoint.length > 0 &&
        !this.arraysEqual(this.container.Config.Entrypoint, this.image.Config.Entrypoint)
      ) {
        from.Container.Entrypoint = this.container.Config.Entrypoint.join(' ');
      }
    }
    return from;
  }
}
