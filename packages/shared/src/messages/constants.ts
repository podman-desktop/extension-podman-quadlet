import { getChannel } from './utils';
import { QuadletApi } from '../apis/quadlet-api';
import { DialogApi } from '../apis/dialog-api';

export const noTimeoutChannels: string[] = [
  getChannel(DialogApi, 'showWarningMessage'),
  getChannel(DialogApi, 'showErrorMessage'),
  getChannel(QuadletApi, 'start'),
  getChannel(QuadletApi, 'stop'),
  getChannel(QuadletApi, 'restart'),
  getChannel(QuadletApi, 'writeIntoMachine'),
  getChannel(QuadletApi, 'refresh'),
];
