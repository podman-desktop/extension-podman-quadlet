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
import type { ServiceQuadlet } from './service-quadlet';
import type { InstallQuadlet } from './install-quadlet';

/**
 * Learn more about Container Quadlet https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html#container-units-container
 */
export interface ContainerQuadlet {
  Service?: ServiceQuadlet;
  Container: {
    /**
     * Add these capabilities, in addition to the default Podman capability set, to the container.
     *
     * This is a space separated list of capabilities.
     */
    AddCapability?: Array<string>;
    /**
     * Adds a device node from the host into the container.
     * The format of this is `HOST-DEVICE[:CONTAINER-DEVICE][:PERMISSIONS]`
     */
    AddDevice?: Array<string>;
    /**
     * Add host-to-IP mapping to /etc/hosts. The format is `hostname:ip`.
     *
     * Equivalent to the Podman `--add-host` option.
     */
    AddHost?: Array<string>;
    /**
     * Set one or more OCI annotations on the container.
     *
     * The format is a list of `key=value` items
     */
    Annotation?: string[];
    /**
     * Indicates whether the container will be auto-updated.
     * The following values are supported:
     * - `registry`: Requires a fully-qualified image reference
     * - `local`: Tells Podman to compare the image a container is using to the image with its raw name in local storage.
     */
    AutoUpdate?: 'registry' | 'local';
    /**
     * The cgroups mode of the Podman container. Equivalent to the Podman `--cgroups` option.
     */
    CgroupsMode?: string;
    /**
     * The name of the Podman container.
     * If this is not specified, the default value of systemd-%N is used,
     * which is the same as the service name but with a systemd- prefix to avoid conflicts with user-managed containers.
     */
    ContainerName?: string;
    /**
     * Load the specified containers.conf module.
     *
     * Equivalent to the Podman `--module` option.
     */
    ContainersConfModule?: Array<string>;
    /**
     * Set network-scoped DNS resolver/nameserver for containers in this network.
     */
    DNS?: Array<string>;
    /**
     * Set custom DNS options.
     */
    DNSOption?: Array<string>;
    /**
     * Set custom DNS search domains. Use **DNSSearch=**. to remove the search domain.
     */
    DNSSearch?: Array<string>;
    /**
     * Drop these capabilities from the default podman capability set, or all to drop all capabilities.
     *
     * This is a space separated list of capabilities.
     */
    DropCapability?: Array<string>;
    /**
     * Override the default ENTRYPOINT from the image.
     *
     * Equivalent to the Podman `--entrypoint` option.
     */
    Entrypoint?: string;
    /**
     * Set an environment variable in the container.
     */
    Environment?: Array<string>;
    /**
     * Use a line-delimited file to set environment variables in the container.
     *
     * The path may be absolute or relative to the location of the unit file.
     */
    EnvironmentFile?: Array<string>;
    /**
     * Use the host environment inside the container.
     */
    EnvironmentHost?: boolean;
    /**
     * Additional arguments for the container; this has exactly the same effect as passing more arguments after a podman run <image> <arguments> invocation.
     */
    Exec?: string;
    /**
     * Exposes a port, or a range of ports (e.g. 50-59), from the host to the container.
     *
     * Equivalent to the Podman `--expose` option.
     */
    ExposeHostPort?: Array<string>;
    /**
     * Run the container in a new user namespace using the supplied GID mapping.
     *
     * Equivalent to the Podman `--gidmap` option.
     */
    GIDMap?: Array<string>;
    /**
     * This key contains a list of arguments passed directly between podman and run in the generated file. It can be used to access Podman features otherwise unsupported by the generator.
     */
    GlobalArgs?: Array<string>;
    /**
     * The (numeric) GID to run as inside the container.
     * This does not need to match the GID on the host, which can be modified with UsersNS, but if that is not specified, this GID is also used on the host.
     */
    Group?: string;
    /**
     * Assign additional groups to the primary user running within the container process.
     * Also supports the keep-groups special flag.
     *
     * Equivalent to the Podman `--group-add` option.
     */
    GroupAdd?: string;
    /**
     * Set or alter a healthcheck command for a container.
     */
    HealthCmd?: string;
    /**
     * Set an interval for the healthchecks. An interval of disable results in no automatic timer setup.
     *
     * Equivalent to the Podman `--health-interval` option.
     */
    HealthInterval?: string;
    /**
     * Set the destination of the HealthCheck log.
     * - `local`: (default) HealthCheck logs are stored in overlay containers.
     * - `directory`: creates a log file named <container-ID>-healthcheck.log with HealthCheck logs in the specified directory.
     * - `events_logger`: The log will be written with logging mechanism set by events_logger.
     */
    HealthLogDestination?: string;
    /**
     * Set maximum number of attempts in the HealthCheck log file. (‘0’ value means an infinite number of attempts in the log file) (Default: 5 attempts)
     *
     * Equivalent to the Podman `--Health-max-log-count` option.
     */
    HealthMaxLogCount?: number;
    /**
     * Action to take once the container transitions to an unhealthy state. The “kill” action in combination integrates best with systemd. Once the container turns unhealthy, it gets killed, and systemd restarts the service.
     *
     * Equivalent to the Podman `--health-on-failure` option.
     */
    HealthOnFailure?: string;
    /**
     * The number of retries allowed before a healthcheck is considered to be unhealthy.
     *
     * Equivalent to the Podman `--health-retries` option.
     */
    HealthRetries?: number;
    /**
     * The initialization time needed for a container to bootstrap.
     *
     * Equivalent to the Podman `--health-start-period` option.
     */
    HealthStartPeriod?: string;
    /**
     * Set a startup healthcheck command for a container.
     *
     * Equivalent to the Podman `--health-startup-cmd` option.
     */
    HealthStartupCmd?: string;
    /**
     * Set an interval for the startup healthcheck. An interval of disable results in no automatic timer setup.
     *
     * Equivalent to the Podman `--health-startup-interval` option.
     */
    HealthStartupInterval?: string;
    /**
     * The number of attempts allowed before the startup healthcheck restarts the container.
     *
     * Equivalent to the Podman --health-startup-retries option.
     */
    HealthStartupRetries?: number;
    /**
     * The number of successful runs required before the startup healthcheck succeeds and the regular healthcheck begins.
     *
     * Equivalent to the Podman `--health-startup-success` option.
     */
    HealthStartupSuccess?: number;
    /**
     * The maximum time a startup healthcheck command has to complete before it is marked as failed.
     *
     * Equivalent to the Podman `--health-startup-timeout` option.
     */
    HealthStartupTimeout?: string;
    /**
     * The maximum time allowed to complete the healthcheck before an interval is considered failed.
     *
     * Equivalent to the Podman `--health-timeout` option.
     */
    HealthTimeout?: string;
    /**
     * Sets the host name that is available inside the container.
     *
     * Equivalent to the Podman `--hostname` option.
     */
    HostName?: string;
    /**
     * The image to run in the container.
     *
     * @remarks It is recommended to use a fully qualified image name rather than a short name, both for performance and robustness reasons.
     */
    Image?: string;
    /**
     * Specify a static IPv4 address for the container, for example 10.88.64.128.
     *
     * Equivalent to the Podman `--ip` option.
     */
    IP?: string;
    /**
     * Specify a static IPv6 address for the container, for example fd46:db93:aa76:ac37::10.
     *
     * Equivalent to the Podman `--ip6` option.
     */
    IP6?: string;
    /**
     * Set one or more OCI labels on the container.
     *
     * The format is a list of key=value items, similar to Environment.
     */
    Label?: Array<string>;
    /**
     * Set the log-driver used by Podman when running the container.
     *
     * Equivalent to the Podman `--log-driver` option.
     */
    LogDriver?: string;
    /**
     * Set the log-opt (logging options) used by Podman when running the container.
     *
     * Equivalent to the Podman `--log-opt` option.
     */
    LogOpt?: Array<string>;
    /**
     * Specify the paths to mask separated by a colon. Mask=/path/1:/path/2.
     * A masked path cannot be accessed inside the container.
     */
    Mask?: string;
    /**
     * Attach a filesystem mount to the container.
     *
     * This is equivalent to the Podman `--mount` option, and generally has the form type=TYPE,TYPE-SPECIFIC-OPTION[,...].
     *
     * **Special cases**:
     * - For `type=volume`, if source ends with .volume, the Podman named volume generated by the corresponding .volume file is used.
     * - For `type=image`, if source ends with .image, the image generated by the corresponding .image file is used.
     */
    Mount?: Array<string>;
    /**
     * Specify a custom network for the container.
     *
     * This has the same format as the `--network` option to podman run.
     *
     * **Special cases**:
     * - If the `name` of the network ends with `.network`, a Podman network called `systemd-$name` is used, and the generated systemd service contains a dependency on the `$name-network.service`. Such a network can be automatically created by using a `$name.network` Quadlet file. Note: the corresponding .network file must exist.
     * - If the `name` ends with `.container`, the container will reuse the network stack of another container created by $name.container. The generated systemd service contains a dependency on `$name.service`. Note: the corresponding .container file must exist.
     */
    Network?: Array<string>;
    /**
     * Add a network-scoped alias for the container.
     *
     * This has the same format as the `--network-alias` option to podman run.
     *
     * Aliases can be used to group containers together in DNS resolution: for example, setting NetworkAlias=web on multiple containers will make a DNS query for web resolve to all the containers with that alias.
     */
    NetworkAlias?: Array<string>;
    /**
     * If enabled (defaults to false), this disables the container processes from gaining additional privileges via things like setuid and file capabilities.
     */
    NoNewPrivileges?: boolean;
    /**
     * By default, Podman is run in such a way that the systemd startup notify command is handled by the container runtime. In other words, the service is deemed started when the container runtime starts the child in the container.
     *
     * However, if the container application supports sd_notify, then setting Notify to true passes the notification details to the container allowing it to notify of startup on its own.
     */
    Notify?: boolean;
    /**
     * Tune the container’s pids limit.
     *
     * This is equivalent to the Podman `--pids-limit` option.
     */
    PidsLimit?: number;
    /**
     * Specify a Quadlet `.pod` unit to link the container to.
     * The value must take the form of `<name>.pod` and the .pod unit must exist.
     *
     * Quadlet will add all the necessary parameters to link between the container and the pod and between their corresponding services.
     */
    Pod?: string;
    /**
     * This key contains a list of arguments passed directly to the end of the podman run command in the generated file (right before the image name in the command line).
     */
    PodmanArgs?: Array<string>;
    /**
     * Exposes a port, or a range of ports (e.g. 50-59), from the container to the host.
     *
     * Equivalent to the Podman `--publish` option.
     */
    PublishPort?: string[];
    /**
     * Set the image pull policy. This is equivalent to the Podman `--pull` option
     */
    Pull?: string;
    /**
     * If enabled (defaults to false), makes the image read-only.
     */
    ReadOnly?: boolean;
    /**
     * If ReadOnly is set to true, mount a read-write tmpfs on /dev, /dev/shm, /run, /tmp, and /var/tmp.
     */
    ReadOnlyTmpfs?: boolean;
    /**
     * The rootfs to use for the container. Rootfs points to a directory on the system that contains the content to be run within the container.
     *
     * @remarks This option conflicts with the Image option.
     */
    Rootfs?: string;
    /**
     * If enabled, the container has a minimal init process inside the container that forwards signals and reaps processes.
     */
    RunInit?: boolean;
    /**
     * Set the seccomp profile to use in the container. If unset, the default podman profile is used. Set to either the pathname of a json file, or unconfined to disable the seccomp filters.
     */
    SeccompProfile?: string;
    /**
     * Use a Podman secret in the container either as a file or an environment variable.
     *
     * This is equivalent to the Podman `--secret` option and generally has the form `secret[,opt=opt ...]`
     */
    Secret?: string;
    /**
     * Turn off label separation for the container.
     */
    SecurityLabelDisable?: boolean;
    /**
     * Set the label file type for the container files.
     */
    SecurityLabelFileType?: string;
    /**
     * Set the label process level for the container processes.
     */
    SecurityLabelLevel?: string;
    /**
     * Allow SecurityLabels to function within the container.
     * This allows separation of containers created within the container.
     */
    SecurityLabelNested?: string;
    /**
     * Set the label process type for the container processes.
     */
    SecurityLabelType?: string;
    /**
     * Size of `/dev/shm`.
     *
     * This is equivalent to the Podman `--shm-size` option and generally has the form number[unit]
     */
    ShmSize?: string;
    /**
     * Create the pod in a new user namespace using the map with name in the `/etc/subgid` file.
     *
     * Equivalent to the Podman `--subgidname` option.
     */
    SubGIDMap?: string;
    /**
     * Create the pod in a new user namespace using the supplied UID mapping.
     *
     * Equivalent to the Podman `--uidmap` option.
     */
    UIDMap?: Array<string>;
    /**
     * Set the user namespace mode for the pod.
     *
     * This is equivalent to the Podman `--userns` option and generally has the form `MODE[:OPTIONS,...]`.
     */
    UserNS?: string;
    /**
     * Mount a volume in the pod.
     *
     * This is equivalent to the Podman `--volume` option, and generally has the form `[[SOURCE-VOLUME|HOST-DIR:]CONTAINER-DIR[:OPTIONS]]`.
     *
     * **Special case**:
     * - If `SOURCE-VOLUME` ends with `.volume`, Quadlet will look for the corresponding .volume Quadlet unit. If found, Quadlet will use the name of the Volume set in the Unit, otherwise, systemd-$name is used. Note: the corresponding .volume file must exist.
     */
    Volume?: Array<string>;
  };
  Install?: InstallQuadlet;
}
