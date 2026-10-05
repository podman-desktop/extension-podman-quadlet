/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
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
export interface PodInfoContainerUI {
  Id: string;
  Names: string;
  Status: string;
}

/**
 * This is a copy from {@link https://github.com/podman-desktop/podman-desktop/blob/f6d0d3cb8b414fc01d81a47d1539c6332b57f04c/packages/renderer/src/lib/pod/PodInfoUI.ts#L33}
 */
export interface PodInfoUI {
  id: string;
  shortId: string;
  name: string;
  engineId: string;
  engineName: string;
  status: string;
  age: string;
  created: string;
  selected: boolean;
  containers: PodInfoContainerUI[];
  actionInProgress?: boolean;
  actionError?: string;
  node?: string;
  namespace?: string;
}
