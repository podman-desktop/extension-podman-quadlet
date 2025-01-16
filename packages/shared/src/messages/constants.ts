import { getChannel } from './utils';
import { PodletApi } from '../apis/podlet-api';

export const noTimeoutChannels: string[] = [getChannel(PodletApi, 'install')];
