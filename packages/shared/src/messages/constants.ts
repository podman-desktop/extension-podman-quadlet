import { getChannel } from './utils';
import { QuadletApi } from '../apis/quadlet-api';
import { DialogApi } from '../apis/dialog-api';

export const noTimeoutChannels: string[] = [
  getChannel(DialogApi, 'showWarningMessage'),
  getChannel(QuadletApi, 'start'),
  getChannel(QuadletApi, 'writeIntoMachine'),
];
