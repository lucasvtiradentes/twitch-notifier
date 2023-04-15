import { configs } from './config';
import TwitchNotifier from '../src/TwitchNotifier';

const twitchNotifier = new TwitchNotifier(configs);

twitchNotifier.getTwichStreamersData().then((data) => {
  const filtered = twitchNotifier.filterStreamersToNotify(data);
  console.log(data);
  console.log(data.length, filtered.length);
});
