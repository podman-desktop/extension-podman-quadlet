/**
 * @author axel7083
 */
import { RPCReadable } from '/@/utils/rpcReadable';
import { Messages } from '@podman-desktop/quadlet-extension-core-api';
import { quadletAPI } from '/@/api/client';
import type { SynchronisationInfo } from '@podman-desktop/quadlet-extension-core-api';

export const synchronisation = RPCReadable<SynchronisationInfo[]>(
  [],
  [Messages.UPDATE_QUADLETS],
  quadletAPI.getSynchronisationInfo,
);
