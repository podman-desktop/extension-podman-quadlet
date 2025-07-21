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

import type { BaseQuadlet } from './base-quadlet';
import type { Quadlet } from './quadlet';

export interface ServiceQuadlet extends BaseQuadlet {
  /**
   * systemd service name
   */
  service: string;

  /**
   * raw content (generate) of the service file
   */
  content: string;
}

export function isServiceQuadlet(quadlet: Quadlet): quadlet is ServiceQuadlet {
  return !!quadlet.service;
}
