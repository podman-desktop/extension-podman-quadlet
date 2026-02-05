/**
 * @author axel7083
 */
import { RPCReadable } from '/@/utils/rpcReadable';
import type { QuadletInfo } from '@quadlet/core-api';
import { Messages } from '@quadlet/core-api';
import { quadletAPI } from '/@/api/client';
import type { Readable } from 'svelte/store';

export const quadletsInfo: Readable<QuadletInfo[]> = RPCReadable<QuadletInfo[]>(
  [],
  [Messages.UPDATE_QUADLETS],
  quadletAPI.all,
);
