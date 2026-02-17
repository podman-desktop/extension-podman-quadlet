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

/**
 * Learn more about Network Quadlet https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html#network-units-network
 */
export interface NetworkQuadlet {
  Network: {
    /**
     * The (optional) name of the Podman network. If this is not specified, the default
     * value is the same name as the unit, but with a systemd- prefix.
     */
    NetworkName?: string;
    /**
     * Network driver (e.g. bridge, macvlan, ipvlan). When omitted, Podman default applies.
     */
    Driver?: string;
    /**
     * Set one or more OCI labels on the network. The format is a list of key=value items.
     */
    Label?: Array<string>;
    /**
     * Driver specific options as a comma-separated string (e.g. mtu=1500,mode=bridge).
     */
    Options?: string;
    /**
     * Mark the network as internal (no external routing).
     */
    Internal?: boolean;
    /**
     * Enable IPv6 addressing.
     */
    IPv6?: boolean;
    /**
     * Configure one or more subnets in CIDR notation.
     */
    Subnet?: Array<string>;
    /**
     * Configure one or more gateways for the corresponding subnets.
     */
    Gateway?: Array<string>;
  };
}
