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
import { IGNORED_ANNOTATIONS } from '../constants';

/**
 * Detect if user used `--annotation` option (E.g. podman run --annotation=foo=bar hello-world)
 */
export class Annotation extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if (!('Annotations' in this.container.HostConfig)) return from;

    const containerAnnotations: Map<string, string> = this.toMap(
      this.container.HostConfig.Annotations as Record<string, string>,
    );
    const imageAnnotations: Map<string, string> = this.toMap(
      'Annotations' in this.image ? (this.image.Annotations as Record<string, string>) : {},
    );

    // we can have multiple annotations
    from.Container.Annotation = Array.from(containerAnnotations.entries()).reduce((accumulator, [key, value]) => {
      if (imageAnnotations.get(key) !== value && !IGNORED_ANNOTATIONS.has(key)) {
        accumulator.push(`${key}=${value}`);
      }

      return accumulator;
    }, [] as Array<string>);

    return from;
  }
}
