/**
 * @author axel7083
 */
import type { QuadletInfo } from '../models/quadlet-info';
import type { ProviderContainerConnectionIdentifierInfo } from '../models/provider-container-connection-identifier-info';
import type { QuadletCheck } from '../models/quadlet-check';
import type { SynchronisationInfo } from '../models/synchronisation';

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

  abstract validate(content: string): Promise<QuadletCheck[]>;

  abstract saveIntoMachine(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    quadlet: string; // content
    name: string; // filename
  }): Promise<void>;

  abstract updateIntoMachine(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    quadlet: string; // content
    path: string;
  }): Promise<void>;

  abstract getSynchronisationInfo(): Promise<SynchronisationInfo[]>;

  abstract getKubeYAML(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<string>;
}
