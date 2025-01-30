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


import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';

export function isKubeQuadlet(quadlet: QuadletInfo): quadlet is QuadletInfo & { type: QuadletType.KUBE } {
  return quadlet.type === QuadletType.KUBE;
}