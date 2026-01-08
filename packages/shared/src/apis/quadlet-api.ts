/**
 * @author axel7083
 */
import type { QuadletInfo } from '../models/quadlet-info';
import type { ProviderContainerConnectionIdentifierInfo } from '../models/provider-container-connection-identifier-info';
import type { SynchronisationInfo } from '../models/synchronisation';
import type { Template } from '../models/template';

export abstract class QuadletApi {
  static readonly CHANNEL: string = 'quadlet-api';

  abstract all(): Promise<QuadletInfo[]>;
  abstract refresh(): Promise<void>;

  /**
   * Given a connection and a quadlet id, start the corresponding systemd service
   * @remarks throw an error if the quadlet does not have an associated systemd service
   * @param connection the connection where the quadlet is hosted
   * @param id the id of the quadlet
   */
  abstract start(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean>;
  /**
   * Given a connection and a quadlet id, stop the corresponding systemd service
   * @remarks throw an error if the quadlet does not have an associated systemd service
   * @param connection the connection where the quadlet is hosted
   * @param id the id of the quadlet
   */
  abstract stop(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean>;
  /**
   * Given a connection and a quadlet id, restart the corresponding systemd service
   * @remarks throw an error if the quadlet does not have an associated systemd service
   * @param connection the connection where the quadlet is hosted
   * @param id the id of the quadlet
   */
  abstract restart(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean>;
  abstract remove(connection: ProviderContainerConnectionIdentifierInfo, ...ids: string[]): Promise<void>;
  abstract read(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<string>;

  /**
   * This method will use journalctl to create a logger
   * @remarks throw an error if the quadlet does not have an associated systemd service
   * @param options
   */
  abstract createQuadletLogger(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    quadletId: string;
  }): Promise<string>;
  abstract disposeLogger(loggerId: string): Promise<void>;
  /**
   * Write files into the configured folder for Quadlets.
   * @param options
   */
  abstract writeIntoMachine(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    files: Array<{ filename: string; content: string }>;
    /**
     * When writing to the machine, by default the code will call systemd daemon-reload
     * @default false
     */
    skipSystemdDaemonReload?: boolean;
  }): Promise<void>;

  /**
   * Read a file from a given connection
   * @param options
   */
  abstract readIntoMachine(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    path: string;
  }): Promise<string>;

  abstract getSynchronisationInfo(): Promise<SynchronisationInfo[]>;
  /**
   * List Quadlets templates
   */
  abstract templates(): Promise<Array<Template>>;
}
