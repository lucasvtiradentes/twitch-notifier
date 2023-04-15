import TwitchNotifier from '../src/TwitchNotifier';
type Configs = TwitchNotifier['config'];

export const configs: Configs = {
  twitch: {
    channels: [
      ['razah', {}],
      ['gaules', {}],
      ['mch_agg', {}],
      ['brnwowzk1', {}]
    ],
    disabledHours: [],
    ignoredWords: []
  },
  settings: {
    timeZoneCorrection: -3,
    minutesBetweenChecks: 10,
    checkFunction: 'checkLiveStreams'
  }
};
