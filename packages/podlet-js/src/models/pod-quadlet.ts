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
import type { ServiceQuadlet } from './service-quadlet';

/**
 * Learn more about Pod Quadlet https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html#pod-units-pod
 */
export interface PodQuadlet {
  Service?: ServiceQuadlet;
  Pod: {
    /**
     * Add host-to-IP mapping to /etc/hosts. The format is hostname:ip.
     *
     * Equivalent to the Podman --add-host option. This key can be listed multiple times.
     */
    AddHost?: Array<`${string}:${string}`>;
    /**
     * Load the specified containers.conf(5) module. Equivalent to the Podman --module option.
     *
     * This key can be listed multiple times.
     */
    ContainersConfModule?: Array<string>;
    /**
     * Set network-scoped DNS resolver/nameserver for containers in this pod.
     *
     * This key can be listed multiple times.
     */
    DNS?: Array<string>;
    /**
     * Set custom DNS options.
     *
     * This key can be listed multiple times.
     */
    DNSOption?: Array<string>;
    /**
     * Set custom DNS search domains. Use `DNSSearch=.` to remove the search domain.
     *
     * This key can be listed multiple times.
     */
    DNSSearch?: Array<string>;
    /**
     * Set the exit policy of the pod when the last container exits. Default for quadlets is stop.
     *
     * To keep the pod active, set ExitPolicy=continue.
     */
    ExitPolicy?: string;
    /**
     * Create the pod in a new user namespace using the supplied GID mapping. Equivalent to the Podman --gidmap option.
     *
     * This key can be listed multiple times.
     */
    GIDMap?: Array<string>;
    /**
     * This key contains a list of arguments passed directly between podman and pod in the generated file. It can be used to access Podman features otherwise unsupported by the generator. Since the generator is unaware of what unexpected interactions can be caused by these arguments, it is not recommended to use this option.
     *
     * The format of this is a space separated list of arguments, which can optionally be individually escaped to allow inclusion of whitespace and other control characters.
     *
     * This key can be listed multiple times.
     */
    GlobalArgs?: Array<string>;
    /**
     * Set the pod’s hostname inside all containers.
     *
     * The given hostname is also added to the /etc/hosts file using the container’s primary IP address (also see the --add-host option).
     *
     * Equivalent to the Podman --hostname option. This key can be listed multiple times.
     */
    HostName?: string;
    /**
     * Specify a static IPv4 address for the pod, for example 10.88.64.128. Equivalent to the Podman --ip option.
     */
    IP?: string;
    /**
     * Specify a static IPv6 address for the pod, for example fd46:db93:aa76:ac37::10. Equivalent to the Podman --ip6 option.
     */
    IP6?: string;
    /**
     * Set one or more OCI labels on the pod. The format is a list of key=value items, similar to Environment.
     *
     * This key can be listed multiple times.
     */
    Label?: Array<string>;
    /**
     * Specify a custom network for the pod. This has the same format as the --network option to podman pod create. For example, use host to use the host network in the pod, or none to not set up networking in the pod.
     *
     * - Special case:
     *
     * If the name of the network ends with .network, Quadlet will look for the corresponding .network Quadlet unit. If found, Quadlet will use the name of the Network set in the Unit, otherwise, systemd-$name is used.
     *
     * The generated systemd service contains a dependency on the service unit generated for that .network unit. Note: the corresponding .network file must exist.
     *
     * This key can be listed multiple times.
     */
    Network?: Array<string>;
    /**
     * Add a network-scoped alias for the pod. This has the same format as the --network-alias option to podman pod create. Aliases can be used to group containers together in DNS resolution: for example, setting NetworkAlias=web on multiple containers will make a DNS query for web resolve to all the containers with that alias.
     *
     * This key can be listed multiple times.
     */
    NetworkAlias?: Array<string>;
    /**
     * This key contains a list of arguments passed directly to the end of the podman pod create command in the generated file. It can be used to access Podman features otherwise unsupported by the generator. Since the generator is unaware of what unexpected interactions can be caused by these arguments, is not recommended to use this option.
     *
     * The format of this is a space separated list of arguments, which can optionally be individually escaped to allow inclusion of whitespace and other control characters.
     *
     * This key can be listed multiple times.
     */
    PodmanArgs?: Array<string>;
    /**
     * The (optional) name of the Podman pod. If this is not specified, the default value is the same name as the unit, but with a systemd- prefix, i.e. a $name.pod file creates a systemd-$name Podman pod to avoid conflicts with user-managed pods.
     *
     * Please note that pods and containers cannot have the same name. So, if PodName is set, it must not conflict with any container.
     */
    PodName?: string;
    /**
     * Exposes a port, or a range of ports (e.g. 50-59), from the pod to the host. Equivalent to the Podman --publish option. The format is similar to the Podman options, which is of the form ip:hostPort:containerPort, ip::containerPort, hostPort:containerPort or containerPort, where the number of host and container ports must be the same (in the case of a range).
     *
     * If the IP is set to 0.0.0.0 or not set at all, the port is bound on all IPv4 addresses on the host; use [::] for IPv6.
     *
     * Note that not listing a host port means that Podman automatically selects one, and it may be different for each invocation of service. This makes that a less useful option. The allocated port can be found with the podman port command.
     *
     * When using host networking via Network=host, the PublishPort= option cannot be used.
     *
     * This key can be listed multiple times.
     */
    PublishPort?: Array<string>;
    /**
     * By default, Quadlet will name the systemd service unit by appending -pod to the name of the Quadlet. Setting this key overrides this behavior by instructing Quadlet to use the provided name.
     *
     * Note, the name should not include the .service file extension
     */
    ServiceName?: string;
    /**
     * Size of /dev/shm.
     *
     * This is equivalent to the Podman --shm-size option and generally has the form number[unit]
     */
    ShmSize?: string;
    /**
     * Create the pod in a new user namespace using the map with name in the /etc/subgid file. Equivalent to the Podman --subgidname option.
     */
    SubGIDMap?: string;
    /**
     * Create the pod in a new user namespace using the map with name in the /etc/subuid file. Equivalent to the Podman --subuidname option.
     */
    SubUIDMap?: string;
    /**
     * Create the pod in a new user namespace using the supplied UID mapping. Equivalent to the Podman --uidmap option.
     *
     * This key can be listed multiple times.
     */
    UIDMap?: Array<string>;
    /**
     * Set the user namespace mode for the pod. This is equivalent to the Podman --userns option and generally has the form MODE[:OPTIONS,...].
     */
    UserNS?: string;
    /**
     * Mount a volume in the pod. This is equivalent to the Podman --volume option, and generally has the form [[SOURCE-VOLUME|HOST-DIR:]CONTAINER-DIR[:OPTIONS]].
     *
     * If SOURCE-VOLUME starts with ., Quadlet resolves the path relative to the location of the unit file.
     *
     * Special case:
     *
     * If SOURCE-VOLUME ends with .volume, Quadlet will look for the corresponding .volume Quadlet unit. If found, Quadlet will use the name of the Volume set in the Unit, otherwise, systemd-$name is used. Note: the corresponding .volume file must exist.
     *
     * The generated systemd service contains a dependency on the service unit generated for that .volume unit, or on $name-volume.service if the .volume unit is not found.
     *
     * This key can be listed multiple times.
     */
    Volume?: Array<string>;
  };
}
