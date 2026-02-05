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
import type { ContainerInspectInfo, ImageInspectInfo } from '@podman-desktop/api';
import { stringify } from 'js-ini';
import type { ContainerQuadletBuilder } from './builders/container-quadlet-builder';
import type { ContainerQuadlet } from '../models/container-quadlet';
import { AddHost } from './builders/add-host';
import { Annotation } from './builders/annotation';
import { PublishPort } from './builders/publish-port';
import { Image } from './builders/image';
import { Name } from './builders/name';
import { Entrypoint } from './builders/entrypoint';
import { Environment } from './builders/environment';
import { Exec } from './builders/exec';
import { ReadOnly } from './builders/read-only';
import { Mount } from './builders/mount';
import { Generator } from '../utils/generator';
import { Restart } from './builders/restart';
import { WantedBy } from './builders/wanted-by';

export interface ContainerGeneratorOptions {
  /**
   * This option may be used to make the container start on boot
   * @example `default.target`
   */
  wantedBy?: string;
}

export interface ContainerGeneratorDependencies {
  container: ContainerInspectInfo;
  image: ImageInspectInfo;
  options?: ContainerGeneratorOptions;
}

export class ContainerGenerator extends Generator<ContainerGeneratorDependencies> {
  override generate(): string {
    // all builders to use
    const builders: Array<new (dep: ContainerGeneratorDependencies) => ContainerQuadletBuilder> = [
      AddHost,
      Annotation,
      PublishPort,
      Image,
      Name,
      Entrypoint,
      Exec,
      Environment,
      ReadOnly,
      Mount,
      Restart,
      WantedBy,
    ];

    const containerQuadlet: ContainerQuadlet = builders.reduce(
      (accumulator, current) => {
        return new current(this.dependencies).build(accumulator);
      },
      {
        Container: {},
      } as ContainerQuadlet,
    );

    return stringify(this.format(containerQuadlet));
  }
}
