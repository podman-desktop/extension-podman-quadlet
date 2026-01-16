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
import type { ContainerInspectInfo, ImageInspectInfo } from '@podman-desktop/api';
import type { ContainerGeneratorDependencies, ContainerGeneratorOptions } from '../container-generator';

export abstract class ContainerQuadletBuilder {
  constructor(private dependencies: ContainerGeneratorDependencies) {}

  protected get image(): ImageInspectInfo {
    return this.dependencies.image;
  }
  protected get container(): ContainerInspectInfo {
    return this.dependencies.container;
  }
  protected get options(): ContainerGeneratorOptions {
    return this.dependencies.options ?? {};
  }

  /**
   * Utility function
   * @param record
   * @protected
   */
  protected toMap<T>(record: Record<string, T>): Map<string, T> {
    return new Map(Object.entries(record));
  }

  protected arraysEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  abstract build(from: ContainerQuadlet): ContainerQuadlet;
}
