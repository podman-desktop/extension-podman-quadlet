import type { ServiceQuadlet } from './service-quadlet';

/**
 * Learn more about Image Quadlet https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html#image-units-image
 */
export interface ImageQuadlet {
  Service?: ServiceQuadlet,
  Image: {
    /**
     * All tagged images in the repository are pulled.
     *
     * This is equivalent to the Podman --all-tags option.
     */
    AllTags?: boolean;
    /**
     * Override the architecture, defaults to hosts, of the image to be pulled.
     *
     * This is equivalent to the Podman --arch option.
     */
    Arch?: string;
    /**
     * Path of the authentication file.
     *
     * This is equivalent to the Podman --authfile option.
     */
    AuthFile?: string;
    /**
     * Use certificates at path (*.crt, *.cert, *.key) to connect to the registry.
     *
     * This is equivalent to the Podman --cert-dir option.
     */
    CertDir?: string;
    /**
     * Load the specified containers.conf(5) module.
     *
     * Equivalent to the Podman --module option.
     */
    ContainersConfModule?: Array<string>;
    /**
     * The [username[:password]] to use to authenticate with the registry, if required.
     *
     * This is equivalent to the Podman --creds option.
     */
    Creds?: string;
    /**
     * The [key[:passphrase]] to be used for decryption of images.
     *
     * This is equivalent to the Podman --decryption-key option.
     */
    DecryptionKey?: string;
    /**
     * This key contains a list of arguments passed directly between podman and image in the generated file. It can be used to access Podman features otherwise unsupported by the generator. Since the generator is unaware of what unexpected interactions can be caused by these arguments, it is not recommended to use this option.
     *
     * The format of this is a space separated list of arguments, which can optionally be individually escaped to allow inclusion of whitespace and other control characters.
     */
    GlobalArgs?: Array<string>;
    /**
     * The image to pull. It is recommended to use a fully qualified image name rather than a short name, both for performance and robustness reasons.
     *
     * The format of the name is the same as when passed to podman pull. So, it supports using :tag or digests to guarantee the specific image version.
     */
    Image?: string;
    /**
     * Actual FQIN of the referenced Image.
     * Only meaningful when source is a file or directory archive.
     */
    ImageTag?: string;
    /**
     * Override the OS, defaults to hosts, of the image to be pulled.
     * This is equivalent to the Podman `--os` option.
     */
    OS?: string;
    /**
     * This key contains a list of arguments passed directly to the end of the podman image pull command in the generated file
     */
    PodmanArgs?: Array<string>;
    /**
     * Require HTTPS and verification of certificates when contacting registries.
     *
     * This is equivalent to the Podman --tls-verify option.
     */
    TLSVerify?: string;
    /**
     * Override the default architecture variant of the container image.
     *
     * This is equivalent to the Podman --variant option.
     */
    Variant?: string;
  };
}
