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
import type { Quadlet } from './quadlet';
import type { BaseQuadlet } from './base-quadlet';

export interface TemplateInstanceQuadlet extends BaseQuadlet {
  /**
   * The template property represents the template name
   * https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html#template-files
   */
  template: string;
  /**
   * For template like `foo@.container`, you may create an instance `foo@bar.container`
   * will mean the argument is `bar`
   */
  argument: string;
}

export function isTemplateInstanceQuadlet(quadlet: Quadlet): quadlet is TemplateInstanceQuadlet {
  return 'template' in quadlet && 'argument' in quadlet && !!quadlet.argument;
}
