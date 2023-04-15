import TwitchNotifier from '../src/TwitchNotifier';
type Configs = TwitchNotifier['config'];

// prettier-ignore
export const configs: Configs = {
  twitch: {
    channels: [
      ['razah', {}],
      ['gaules', {}],
      ['mch_agg', { searchedWords: ['live'] }],  // specific searched words | you only will be notified if the current stream title contain at least one of these words
      ['brnwowzk1', { ignoredWords: ['rr'] }]    // specific ignored words | if a the current stream title contains any of these words, you will not be notified about it
    ],
    ignoredWords: ['rerun']                      // globaly ignored words | if a stream title contains any of these words, you will not be notified about it
  },
  settings: {
    disabledHours: [0, 1, 2, 3, 4, 5],           // skiped hours that twitch-notifier will not notify you about your streamers
    timeZoneCorrection: -3,                      // hour difference between your timezone and UTC/GMT timezone | https://www.utctime.net/
    minutesBetweenChecks: 10,                    // delay time between every check
    checkFunction: 'checkLiveStreams'            // development option, dont change
  }
};
