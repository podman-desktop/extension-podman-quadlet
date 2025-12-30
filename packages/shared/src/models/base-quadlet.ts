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

import type { QuadletType } from '../utils/quadlet-type';

export type QuadletState = 'active' | 'inactive' | 'deleting' | 'unknown' | 'error';

export interface FileReference {
  name: string;
  path: string;
}

export interface BaseQuadlet {
  /**
   * UUID to internally identify the quadlet
   * @remarks the id is not persisted
   */
  id: string;
  /**
   * path to the quadlet file
   * @example "~/.config/containers/systemd/foo.container"
   */
  path: string;
  /**
   * State of the quadlet
   */
  state: QuadletState;
  /**
   * quadlet have a type based on their extension (.container, .image etc.)
   */
  type: QuadletType;
  /**
   * quadlet can depend on other services (which may be also quadlets)
   * @remarks the string are the service name, not the quadlet ids.
   */
  requires: Array<string>;
  /**
   * A Quadlet can have files associated with them (E.g., Yaml= for Kube Quadlet)
   */
  files: Array<FileReference>;
}
