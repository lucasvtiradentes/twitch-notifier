import TwitchNotifier from './export-lib';
import { config } from './lib-config';

const twitchNotifier = new TwitchNotifier(config);
twitchNotifier.checkChannels();
