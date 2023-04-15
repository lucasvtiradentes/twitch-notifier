import TwitchNotifier from '../src/TwitchNotifier';
type Configs = TwitchNotifier['config'];

export const configs: Configs = {
  twitch: {
    channels: [
      ['razah', { searchedWords: ['LCQ'] }],
      ['gaules', {}],
      ['mch_agg', {}],
      ['brnwowzk1', {}]
    ],
    ignoredWords: ['rerun']
  },
  settings: {
    disabledHours: [0, 1, 2, 3, 4, 5],
    timeZoneCorrection: -3,
    minutesBetweenChecks: 10,
    checkFunction: 'checkLiveStreams'
  }
};
