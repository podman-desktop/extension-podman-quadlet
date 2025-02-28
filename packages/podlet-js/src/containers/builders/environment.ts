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
import { IGNORED_ENVIRONMENTS } from '../constants';

/**
 * Detect if user used `--env` option (E.g. podman run --env=foo=bar hello-world)
 */
export class Environment extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if (!('Env' in this.container.Config)) return from;

    const imageEnvironements: Set<string> = new Set(this.image.Config.Env ?? []);

    // we can have multiple annotations
    from.Container.Environment = this.container.Config.Env.reduce((accumulator, env) => {
      const [key] = env.split('=');

      if (!imageEnvironements.has(env) && !IGNORED_ENVIRONMENTS.has(key)) {
        accumulator.push(env);
      }

      return accumulator;
    }, [] as Array<string>);

    return from;
  }
}
