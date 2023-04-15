import { configs } from './config';
import TwitchNotifier from '../src/TwitchNotifier';

const twitchNotifier = new TwitchNotifier(configs);

console.log(twitchNotifier);
