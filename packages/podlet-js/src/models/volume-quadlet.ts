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
 * Learn more about Volume Quadlet https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html#volume-units-volume
 */
export interface VolumeQuadlet {
  Volume: {
    /**
     * Load the specified containers.conf module.
     *
     * Equivalent to the Podman `--module` option.
     */
    ContainersConfModule?: Array<string>;
    /**
     * If enabled, the content of the image located at the mountpoint of the volume is copied into the volume on the first run.
     */
    Copy?: boolean;
    /**
     * The path of a device which is mounted for the volume.
     */
    Device?: string;

    /**
     * Specify the volume driver name. When set to image, the Image key must also be set.
     *
     * This is equivalent to the Podman --driver option.
     */
    Driver?: string;
    /**
     * The GID that the volume will be created as. Differently than Group=, the specified value is not passed to the mount operation. The specified GID will own the volume’s mount point directory and affects the volume chown operation.
     */
    GID?: string;
    /**
     * This key contains a list of arguments passed directly between podman and volume in the generated file. It can be used to access Podman features otherwise unsupported by the generator. Since the generator is unaware of what unexpected interactions can be caused by these arguments, it is not recommended to use this option.
     *
     * The format of this is a space separated list of arguments, which can optionally be individually escaped to allow inclusion of whitespace and other control characters.
     *
     * This key can be listed multiple times.
     */
    GlobalArgs?: Array<string>;
    /**
     * The host (numeric) GID, or group name to use as the group for the volume. Differently than GID, the specified value is passed to the mount operation.
     */
    Group?: string;
    /**
     * Specifies the image the volume is based on when Driver is set to the image. It is recommended to use a fully qualified image name rather than a short name, both for performance and robustness reasons.
     *
     * The format of the name is the same as when passed to podman pull. So, it supports using :tag or digests to guarantee the specific image version.
     *
     * Special case:
     *
     * - If the name of the image ends with .image, Quadlet will use the image pulled by the corresponding .image file, and the generated systemd service contains a dependency on the $name-image.service (or the service name set in the .image file). Note: the corresponding .image file must exist.
     */
    Image?: string;
    /**
     * Set one or more OCI labels on the volume. The format is a list of key=value items, similar to Environment.
     *
     * This key can be listed multiple times.
     */
    Label?: Array<string>;
    /**
     * The mount options to use for a filesystem as used by the mount(8) command -o option.
     */
    Options?: string;
    /**
     * This key contains a list of arguments passed directly to the end of the podman volume create command in the generated file (right before the name of the volume in the command line). It can be used to access Podman features otherwise unsupported by the generator. Since the generator is unaware of what unexpected interactions can be caused by these arguments, is not recommended to use this option.
     *
     * The format of this is a space separated list of arguments, which can optionally be individually escaped to allow inclusion of whitespace and other control characters.
     *
     * This key can be listed multiple times.
     */
    PodmanArgs?: Array<string>;
    /**
     * The filesystem type of Device as used by the mount(8) commands -t option.
     */
    Type?: string;
    /**
     * The UID that the volume will be created as. Differently than User, the specified value is not passed to the mount operation. The specified UID will own the volume’s mount point directory and affects the volume chown operation.
     */
    UID?: string;
    /**
     * The host (numeric) UID, or user name to use as the owner for the volume. Differently than UID, the specified value is passed to the mount operation.
     */
    User?: string;
    /**
     * The (optional) name of the Podman volume. If this is not specified, the default value is the same name as the unit, but with a systemd- prefix, i.e. a $name.volume file creates a systemd-$name Podman volume to avoid conflicts with user-managed volumes.
     */
    VolumeName?: string;
  };
}
