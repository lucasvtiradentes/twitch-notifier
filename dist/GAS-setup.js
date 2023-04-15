const CONFIGS = {
  twitch: {
    channels: [
      ['razah', {}],
      ['gaules', {}],
      ['mch_agg', { searchedWords: ['live'] }],  // specific searched words | you only will be notified if the current stream title contain at least one of these words
      ['brnwowzk1', { ignoredWords: ['rr'] }]    // specific ignored words | if a the current stream title contains any of these words, you will not be notified about it
    ],
    maximumUptimeMinutes: 60,                    // if a stream uptime is greater than 'x' minutes, you'll not be notified
    ignoredWords: ['rerun']                      // globally ignored words | if a stream title contains any of these words, you will not be notified about it
  },
  settings: {
    disabledHours: [0, 1, 2, 3, 4, 5],           // skiped hours that twitch-notifier will not notify you about your streamers
    timeZoneCorrection: -3,                      // hour difference between your timezone and UTC/GMT timezone | https://www.utctime.net/
    minutesBetweenChecks: 10,                    // delay time between every check
    checkFunction: 'checkLiveStreams'            // development option, dont change
  }
};

function getTwitchNotifier(){
  const version = "1.1.1"
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
  twitchNotifier.setup();
}

function uninstall() {
  const twitchNotifier = getTwitchNotifier();
  twitchNotifier.uninstall();
}