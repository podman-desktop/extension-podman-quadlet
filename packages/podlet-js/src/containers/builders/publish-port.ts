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
 * Detect if user used `-p` option (E.g. podman run -p 8080:80 hello-world)
 */
export class PublishPort extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    const portBindings = this.container.HostConfig.PortBindings;
    if (!portBindings) return from;

    from.Container.PublishPort = Object.entries(portBindings).reduce((accumulator, [key, values]) => {
      if (!Array.isArray(values)) throw new Error(`malformed port binding for container port ${key}`);

      const parts = key.split('/');
      const containerPort = Number.parseInt(parts[0]);
      if (isNaN(containerPort)) throw new Error(`invalid container port: ${key}`);

      values.forEach(value => {
        let result = '';
        if (typeof value.HostIp === 'string' && value.HostIp !== '0.0.0.0') {
          result = `${result}${value.HostIp}:`;
        }
        accumulator.push(`${result}${value.HostPort}:${containerPort}`);
      });

      return accumulator;
    }, [] as Array<string>);

    return from;
  }
}
