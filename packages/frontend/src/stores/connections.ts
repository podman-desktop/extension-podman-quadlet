/**
 * @author axel7083
 */
import { RPCReadable } from '/@/utils/rpcReadable';
import { Messages } from '@quadlet/core-api';
import { providerAPI } from '/@/api/client';
import type { ProviderContainerConnectionDetailedInfo } from '@quadlet/core-api';

export const providerConnectionsInfo = RPCReadable<ProviderContainerConnectionDetailedInfo[]>(
  [],
  [Messages.UPDATE_PROVIDERS],
  providerAPI.all,
);
