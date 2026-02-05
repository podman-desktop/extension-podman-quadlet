/**
 * @author axel7083
 */
import { RPCReadable } from '/@/utils/rpcReadable';
import { Messages } from '@quadlet/core-api';
import { quadletAPI } from '/@/api/client';
import type { SynchronisationInfo } from '@quadlet/core-api';

export const synchronisation = RPCReadable<SynchronisationInfo[]>(
  [],
  [Messages.UPDATE_QUADLETS],
  quadletAPI.getSynchronisationInfo,
);
