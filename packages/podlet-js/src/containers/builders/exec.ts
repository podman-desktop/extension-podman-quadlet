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
 * Detect if user used arguments `podman <image> <arguments>`
 */
export class Exec extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if (
      this.container.Config.Cmd &&
      this.container.Config.Cmd.length > 0 &&
      !this.arraysEqual(this.container.Config.Cmd, this.image.Config.Cmd)
    ) {
      from.Container.Exec = this.container.Config.Cmd.join(' ');
    }
    return from;
  }
}
