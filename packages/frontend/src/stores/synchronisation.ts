/**
 * @author axel7083
 */
import { RPCReadable } from '/@/utils/rpcReadable';
import { Messages } from '/@shared/src/messages';
import { quadletAPI } from '/@/api/client';
import type { SynchronisationInfo } from '/@shared/src/models/synchronisation';

export const synchronisation = RPCReadable<SynchronisationInfo[]>(
  [],
  [Messages.UPDATE_QUADLETS],
  quadletAPI.getSynchronisationInfo,
);
