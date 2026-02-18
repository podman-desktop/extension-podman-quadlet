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
     * Load the specified containers.conf(5) module. Equivalent to the Podman --module option.
     *
     * This key can be listed multiple times.
     */
    ContainersConfModule?: Array<string>;
    /**
     * If enabled, disables the DNS plugin for this network.
     *
     * This is equivalent to the Podman --disable-dns option
     */
    DisableDNS?: boolean;
    /**
     * Set network-scoped DNS resolver/nameserver for containers in this network.
     *
     * This key can be listed multiple times.
     */
    DNS?: Array<string>;
    /**
     * Driver to manage the network. Currently bridge, macvlan and ipvlan are supported.
     *
     * This is equivalent to the Podman --driver option
     */
    Driver?: string;
    /**
     * Define a gateway for the subnet. If you want to provide a gateway address, you must also provide a subnet option.
     *
     * This is equivalent to the Podman --gateway option
     *
     * This key can be listed multiple times.
     */
    Gateway?: Array<string>;
    /**
     * This key contains a list of arguments passed directly between podman and network in the generated file. It can be used to access Podman features otherwise unsupported by the generator. Since the generator is unaware of what unexpected interactions can be caused by these arguments, it is not recommended to use this option.
     *
     * The format of this is a space separated list of arguments, which can optionally be individually escaped to allow inclusion of whitespace and other control characters.
     *
     * This key can be listed multiple times.
     */
    GlobalArgs?: Array<string>;
    /**
     * This option maps the network_interface option in the network config, see podman network inspect. Depending on the driver, this can have different effects; for bridge, it uses the bridge interface name. For macvlan and ipvlan, it is the parent device on the host. It is the same as --opt parent=....
     *
     * This is equivalent to the Podman --interface-name option.
     */
    InterfaceName?: string;
    /**
     * Restrict external access of this network.
     *
     * This is equivalent to the Podman --internal option
     */
    Internal?: boolean;
    /**
     * Set the ipam driver (IP Address Management Driver) for the network. Currently host-local, dhcp and none are supported.
     *
     * This is equivalent to the Podman --ipam-driver option
     */
    IPAMDriver?: string;
    /**
     * Allocate container IP from a range. The range must be a either a complete subnet in CIDR notation or be in the <startIP>-<endIP> syntax which allows for a more flexible range compared to the CIDR subnet. The ip-range option must be used with a subnet option.
     *
     * This is equivalent to the Podman --ip-range option
     *
     * This key can be listed multiple times.
     */
    IPRange?: Array<string>;
    /**
     * Enable IPv6 (Dual Stack) networking.
     *
     * This is equivalent to the Podman --ipv6 option
     */
    IPv6?: boolean;
    /**
     * Set one or more OCI labels on the network. The format is a list of key=value items, similar to Environment.
     *
     * This key can be listed multiple times.
     */
    Label?: Array<string>;
    /**
     * When set to true the network is deleted when the service is stopped
     */
    NetworkDeleteOnStop?: boolean;
    /**
     * The (optional) name of the Podman network. If this is not specified, the default value is the same name as the unit, but with a systemd- prefix, i.e. a $name.network file creates a systemd-$name Podman network to avoid conflicts with user-managed network.
     */
    NetworkName?: string;
    /**
     * Set driver specific options.
     *
     * This is equivalent to the Podman --opt option
     */
    Options?: string;
    /**
     * This key contains a list of arguments passed directly to the end of the podman network create command in the generated file (right before the name of the network in the command line). It can be used to access Podman features otherwise unsupported by the generator. Since the generator is unaware of what unexpected interactions can be caused by these arguments, is not recommended to use this option.
     *
     * The format of this is a space separated list of arguments, which can optionally be individually escaped to allow inclusion of whitespace and other control characters.
     *
     * This key can be listed multiple times.
     */
    PodmanArgs?: Array<string>;
    /**
     * The subnet in CIDR notation.
     *
     * This is equivalent to the Podman --subnet option
     *
     * This key can be listed multiple times.
     */
    Subnet?: Array<string>;
  };
}
