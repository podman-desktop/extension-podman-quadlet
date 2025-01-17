import { getChannel } from './utils';
import { PodletApi } from '../apis/podlet-api';
import { QuadletApi } from '../apis/quadlet-api';

export const noTimeoutChannels: string[] = [
  getChannel(PodletApi, 'install'),
  getChannel(QuadletApi, 'saveIntoMachine'),
];
