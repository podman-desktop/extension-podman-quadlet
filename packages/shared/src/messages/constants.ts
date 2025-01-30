import { getChannel } from './utils';
import { PodletApi } from '../apis/podlet-api';
import { QuadletApi } from '../apis/quadlet-api';
import { DialogApi } from '../apis/dialog-api';

export const noTimeoutChannels: string[] = [
  getChannel(PodletApi, 'install'),
  getChannel(QuadletApi, 'saveIntoMachine'),
  getChannel(DialogApi, 'showWarningMessage'),
  getChannel(QuadletApi, 'start'),
  getChannel(QuadletApi, 'updateIntoMachine'),
];
