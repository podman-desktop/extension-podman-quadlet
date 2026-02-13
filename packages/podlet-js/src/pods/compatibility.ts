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
import { SemVer } from 'semver';

/**
 * Podman introduce the support of .pod quadlets in 5.0.0
 */
export const POD_SUPPORT = new SemVer('5.0.0');

export const FEATURES = {
  Pod: {
    /**
     * The Label key support has been added in Podman 5.6.0
     * https://docs.podman.io/en/v5.6.0/markdown/podman-systemd.unit.5.html#id11
     */
    Labels: new SemVer('5.6.0'),
  },
};
