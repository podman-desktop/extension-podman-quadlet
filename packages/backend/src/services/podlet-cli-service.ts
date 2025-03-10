/**
 * @author axel7083
 */
import type { CliTool, Disposable, Logger, QuickPickItem } from '@podman-desktop/api';
import { ProgressLocation } from '@podman-desktop/api';
import { PODLET_MARKDOWN, PODLET_ORGANISATION, PODLET_REPOSITORY } from '../utils/constants';
import type { PodletCliDependencies } from './podlet-cli-helper';
import { PodletCliHelper } from './podlet-cli-helper';
import fs, { existsSync, promises } from 'node:fs';
import type { AsyncInit } from '../utils/async-init';
import os from 'node:os';
import path from 'node:path';
import { unTarXZ, unZip } from '../utils/archive';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import type { RunResult } from '/@shared/src/models/run-result';
import { TelemetryEvents } from '../utils/telemetry-events';
import { QuadletType } from '/@shared/src/utils/quadlet-type';

export interface PodletGithubReleaseArtifactMetadata extends QuickPickItem {
  tag: string;
  id: number;
}

interface PodletInfo {
  version: string;
  path: string;
}

export class PodletCliService extends PodletCliHelper implements Disposable, AsyncInit {
  #cliTool: CliTool | undefined;
  #executable: string | undefined;

  constructor(dependencies: PodletCliDependencies) {
    super(dependencies);
  }

  public async generate(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    type: QuadletType;
    resourceId: string;
  }): Promise<RunResult> {
    const telemetry: Record<string, unknown> = {};
    try {
      telemetry['quadlet-type'] = options.type.toLowerCase();
      const result = await this.exec(['generate', options.type.toLowerCase(), options.resourceId], options.connection);
      telemetry['exit-code'] = result.exitCode ?? 0;
      return result;
    } catch (err: unknown) {
      telemetry['error'] = err;
      throw err;
    } finally {
      this.logUsage(TelemetryEvents.PODLET_GENERATE, telemetry);
    }
  }

  public async compose(options: {
    filepath: string;
    type: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD;
  }): Promise<RunResult> {
    const telemetry: Record<string, unknown> = {
      'quadlet-target-type': options.type.toLowerCase(),
    };
    try {
      const args = ['compose'];
      switch (options.type) {
        case QuadletType.POD:
          args.push('--pod');
          break;
        case QuadletType.KUBE:
          args.push('--kube');
          break;
      }
      args.push(options.filepath);
      const result = await this.exec(args);
      telemetry['exit-code'] = result.exitCode ?? 0;
      return result;
    } catch (err: unknown) {
      telemetry['error'] = err;
      throw err;
    } finally {
      this.logUsage(TelemetryEvents.PODLET_COMPOSE, telemetry);
    }
  }

  /**
   * Podlet exec
   * @param args
   * @param connection
   */
  protected async exec(args: string[], connection?: ProviderContainerConnectionIdentifierInfo): Promise<RunResult> {
    if (!this.#executable) throw new Error('podlet is not installed.');

    const env: Record<string, string> = {};

    if (connection) {
      const provider = this.dependencies.providers.getProviderContainerConnection(connection);
      if (provider.connection.vmType) {
        const isRoot: boolean = await this.dependencies.podman.isMachineRootful(provider);
        env['CONTAINER_CONNECTION'] = `${connection.name}${isRoot ? '-root' : ''}`;
      }
    }

    return this.dependencies.processApi
      .exec(this.#executable, args, {
        env: env,
      })
      .catch((err: unknown) => {
        // check err is an RunError
        if (
          !err ||
          typeof err !== 'object' ||
          !('exitCode' in err) ||
          !('stdout' in err) ||
          !('stderr' in err) ||
          !('command' in err) ||
          !('exitCode' in err)
        ) {
          throw err;
        }

        return {
          command: err.command as string,
          stderr: err.stderr as string,
          stdout: err.stdout as string,
          exitCode: err.exitCode as number,
        };
      });
  }

  isInstalled(): boolean {
    return !!this.#executable && this.#cliTool?.version !== undefined;
  }

  async init(): Promise<void> {
    const podletInfo = await this.findPodletInfo();
    this.#executable = podletInfo?.path;

    // let's log the podlet version
    if (podletInfo) {
      this.logUsage(TelemetryEvents.PODLET_VERSION, {
        podlet: podletInfo.version,
      });
    }

    // register the cli tool
    this.#cliTool = this.dependencies.cliApi.createCliTool({
      name: 'podlet',
      displayName: 'Podlet',
      markdownDescription: PODLET_MARKDOWN,
      path: podletInfo?.path,
      version: podletInfo?.version,
      images: {
        icon: './icon.png',
      },
      installationSource: 'extension', // todo
    });

    // Podlet Installer
    let selected: PodletGithubReleaseArtifactMetadata | undefined = undefined;
    this.#cliTool.registerInstaller({
      selectVersion: async (): Promise<string> => {
        selected = await this.selectVersion();
        return selected.label;
      },
      doInstall: async (logger: Logger): Promise<void> => {
        if (!selected) throw new Error('no asset selected');

        const telemetry: Record<string, unknown> = {};
        try {
          const executable = await this.download(logger, selected);
          return this.updateCliTool(executable);
        } catch (err: unknown) {
          telemetry['error'] = err;
          throw err;
        } finally {
          this.logUsage(TelemetryEvents.PODLET_INSTALL, telemetry);
        }
      },
      doUninstall: async (): Promise<void> => {
        throw new Error('not installed');
      },
    });
  }

  // Provides last 5 majors releases from GitHub using the GitHub API
  // return name, tag and id of the release
  protected async getLastestsReleasesMetadata(): Promise<PodletGithubReleaseArtifactMetadata[]> {
    // Grab last 5 majors releases from GitHub using the GitHub API
    const lastReleases = await this.dependencies.octokit.repos.listReleases({
      owner: PODLET_ORGANISATION,
      repo: PODLET_REPOSITORY,
      per_page: 5,
    });

    return (
      lastReleases.data
        // filter out prerelease
        .filter(release => !release.prerelease)
        .map(release => {
          return {
            label: release.name ?? release.tag_name,
            tag: release.tag_name,
            id: release.id,
          };
        })
        .slice(0, 5)
    );
  }

  protected async getLatestVersionAsset(): Promise<PodletGithubReleaseArtifactMetadata> {
    const latestReleases = await this.getLastestsReleasesMetadata();
    return latestReleases[0];
  }

  protected async selectVersion(): Promise<PodletGithubReleaseArtifactMetadata> {
    let releasesMetadata = await this.getLastestsReleasesMetadata();

    if (releasesMetadata.length === 0) throw new Error('cannot grab minikube releases');

    // if the user already has an installed version, we remove it from the list
    if (this.#cliTool?.version) {
      releasesMetadata = releasesMetadata.filter(release => release.tag.slice(1) !== this.#cliTool?.version);
    }

    // Show the quickpick
    const selectedRelease = await this.dependencies.window.showQuickPick(releasesMetadata, {
      placeHolder: 'Select Kind version to download',
    });

    if (!selectedRelease) {
      throw new Error('No version selected');
    }
    return selectedRelease;
  }

  /**
   * @remarks `podlet --version` return "podlet 0.3.0"
   * @param executable
   * @protected
   */
  protected async getPodletVersion(executable: string): Promise<string> {
    const result = await this.dependencies.processApi.exec(executable, ['--version']);
    return result.stdout.replace('podlet ', '').trim();
  }

  protected async updateCliTool(executable: string): Promise<void> {
    const version = await this.getPodletVersion(executable);
    this.#executable = executable;
    this.#cliTool?.updateVersion({
      path: executable,
      version: version,
    });
  }

  /**
   * search if podlet is available system-wide or in the extension folder
   */
  private async findPodletInfo(): Promise<PodletInfo | undefined> {
    let path: string | undefined = await this.wherePodlet();

    // if not installed system-wide, let's check extension folder
    if (!path) {
      const extensionPath = this.getPodletExtensionPath();
      if (fs.existsSync(extensionPath)) {
        path = extensionPath;
      } else {
        return undefined;
      }
    }

    let version: string | undefined;
    try {
      version = await this.getPodletVersion(path);
    } catch (err: unknown) {
      console.error(`Something went wrong while getting podlet executable (${path}) version`, err);
      return undefined;
    }

    return {
      path: path,
      version: version,
    };
  }

  protected getWindowsAssetName(arch: string): string {
    if (arch !== 'x64') throw new Error(`architecture ${arch} not supported`);
    return 'podlet-x86_64-pc-windows-msvc.zip';
  }

  protected getMacAssetName(arch: string): string {
    if (arch === 'x64') {
      return 'podlet-x86_64-apple-darwin.tar.xz';
    } else if (arch === 'arm64' || arch === 'aarch64') {
      return 'podlet-aarch64-apple-darwin.tar.xz';
    }
    throw new Error(`architecture ${arch} not supported`);
  }

  protected getLinuxAssetName(arch: string): string {
    if (arch !== 'x64') throw new Error(`architecture ${arch} not supported`);
    return 'podlet-x86_64-unknown-linux-gnu.tar.xz';
  }

  // Get the asset id of a given release number for a given operating system and architecture
  // operatingSystem: win32, darwin, linux (see os.platform())
  // arch: x64, arm64 (see os.arch())
  protected async getReleaseAssetId(releaseId: number): Promise<{ name: string; id: number }> {
    let assetName: string;
    if (this.dependencies.env.isWindows) {
      assetName = this.getWindowsAssetName(os.arch());
    } else if (this.dependencies.env.isMac) {
      assetName = this.getMacAssetName(os.arch());
    } else if (this.dependencies.env.isLinux) {
      assetName = this.getLinuxAssetName(os.arch());
    } else {
      throw new Error('invalid platform detected.');
    }

    const listOfAssets = await this.dependencies.octokit.repos.listReleaseAssets({
      owner: PODLET_ORGANISATION,
      repo: PODLET_REPOSITORY,
      release_id: releaseId,
      per_page: 60,
    });

    // search for the right asset
    const asset = listOfAssets.data.find(asset => assetName === asset.name);
    if (!asset) {
      throw new Error(`No asset found for ${os.platform()} and ${os.arch()}`);
    }

    return {
      name: asset.name,
      id: asset.id,
    };
  }

  /**
   * Handy method to quickly install the latest version of podlet
   */
  public async installLasted(): Promise<void> {
    return this.dependencies.window.withProgress(
      {
        title: 'Installing Podlet',
        location: ProgressLocation.TASK_WIDGET,
      },
      async () => {
        console.debug('Installing latest podlet');
        const artifact: PodletGithubReleaseArtifactMetadata = await this.getLatestVersionAsset();
        console.debug(`Found version ${artifact.tag}`);
        const executable = await this.download(console, artifact);
        console.debug(`Executable downloaded at ${executable}`);
        return this.updateCliTool(executable);
      },
    );
  }

  // Download minikube from the artifact metadata: MinikubeGithubReleaseArtifactMetadata
  // this will download it to the storage bin folder as well as make it executable
  // return the path where the file has been downloaded
  protected async download(logger: Logger, release: PodletGithubReleaseArtifactMetadata): Promise<string> {
    logger.log(`Checking release ${release.tag}`);

    // Get asset id
    const { name: assetName, id: assetId } = await this.getReleaseAssetId(release.id);
    logger.log(`Got asset ${assetName} with id ${assetId}`);

    // Get the storage and check to see if it exists before we download kubectl
    const storageData = this.dependencies.storagePath;
    const storageTmp = path.join(this.dependencies.storagePath, 'tmp');
    if (!existsSync(storageTmp)) {
      logger.warn(`Creating temporary directory ${storageTmp}`);
      await promises.mkdir(storageData, { recursive: true });
    }

    const assetTarget = path.join(storageTmp, assetName);
    const podletExtensionPath = this.getPodletExtensionPath();

    // Download the asset (archive)
    logger.log(`Starting download to ${assetTarget}`);
    await this.downloadReleaseAsset(assetId, assetTarget);

    // extract the executable
    logger.log(`Extracting podlet executable from archive to ${podletExtensionPath}`);
    await this.extractPodletExecutable({
      tmp: storageTmp,
      destination: podletExtensionPath,
      assetName: assetName,
      archive: assetTarget,
    });

    // cleanup tmp directory
    await promises.rm(storageTmp, {
      recursive: true,
    });

    // make the asset executable
    logger.log('Fixing execution permission');
    await this.makeExecutable(podletExtensionPath);

    return podletExtensionPath;
  }

  /**
   * The podlet assets are provided as archives, but not the same format
   * depending on the platform.
   * @param options
   * @protected
   */
  protected async extractPodletExecutable(options: {
    archive: string;
    assetName: string;
    destination: string;
    tmp: string;
  }): Promise<void> {
    let podletExecutable: string;
    const executableName: string = this.getPodletExecutableName();

    if (options.assetName.endsWith('.zip')) {
      await unZip({
        source: options.archive,
        destination: options.tmp,
      });
      podletExecutable = path.join(options.tmp, executableName);
    } else if (options.assetName.endsWith('.tar.xz')) {
      await unTarXZ({
        source: options.archive,
        destination: options.tmp,
      });
      podletExecutable = path.join(
        options.tmp,
        options.assetName.substring(0, options.assetName.indexOf('.tar.xz')),
        executableName,
      );
    } else {
      throw new Error(`unrecognized asset format expected asset in .zip or .tar.xz but got file ${options.assetName}`);
    }

    // throw if the executable file do not exists
    if (!existsSync(podletExecutable)) {
      throw new Error(`podlet executable not found after extraction: expected ${podletExecutable} to exists`);
    }

    // Move the executable outside the tmp folder to destination
    await promises.rename(podletExecutable, options.destination);
  }

  protected async makeExecutable(filePath: string): Promise<void> {
    if (this.dependencies.env.isMac || this.dependencies.env.isLinux) {
      // eslint-disable-next-line sonarjs/file-permissions
      await promises.chmod(filePath, 0o755);
    }
  }

  // download the given asset id
  protected async downloadReleaseAsset(assetId: number, destination: string): Promise<void> {
    const asset = await this.dependencies.octokit.repos.getReleaseAsset({
      owner: PODLET_ORGANISATION,
      repo: PODLET_REPOSITORY,
      asset_id: assetId,
      headers: {
        accept: 'application/octet-stream',
      },
    });

    // check the parent folder exists
    const parentFolder = path.dirname(destination);

    if (!fs.existsSync(parentFolder)) {
      await fs.promises.mkdir(parentFolder, { recursive: true });
    }
    // write the file
    await fs.promises.writeFile(destination, Buffer.from(asset.data as unknown as ArrayBuffer));
  }

  dispose(): void {
    this.#cliTool?.dispose();
  }
}
