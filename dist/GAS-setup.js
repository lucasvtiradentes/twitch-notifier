const CONFIGS = {
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

function getTwitchNotifier(){
  const version = "1.0.0"
  const content = UrlFetchApp.fetch(`https://cdn.jsdelivr.net/npm/twitch-notifier@${version}`).getContentText();
  eval(content)
  const twitchNotifier = new TwitchNotifier(CONFIGS)
  return twitchNotifier;
}

function checkLiveStreams() {
  const twitchNotifier = getTwitchNotifier();
  twitchNotifier.check();
}

function setup() {
  const twitchNotifier = getTwitchNotifier();
  twitchNotifier.install();
}

function uninstall() {
  const twitchNotifier = getTwitchNotifier();
  twitchNotifier.uninstall();
}