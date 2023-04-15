type ChannelOption = {
  ignoredWords?: string[];
  searchedWords?: string[];
};

type ChannelRow = [string, ChannelOption];

type Config = {
  twitch: {
    channels: ChannelRow[];
    disabledHours: number[];
    ignoredWords: string[];
  };
  settings: {
    timeZoneCorrection: number;
    minutesBetweenChecks: number;
    checkFunction: string;
  };
};

type Environment = 'production' | 'development';

type ChannelWithInfo = {
  streamName: string;
  streamLink: string;
  streamImage: string;
  streamIsLive: boolean;
  streamLiveDescription: string;
  streamLivePreviewImage: string;
  streamLiveStartDatetime: string;
  streamLiveUptimeMinutes: number;
  streamLiveUptimeParsed: string;
};

export default class TwitchNotifier {
  VERSION = ''; // version
  APPNAME = 'twitch-notifier';
  GITHUB_REPOSITORY = 'lucasvtiradentes/twitch-notifier';
  ENVIRONMENT = this.detectEnvironment();
  TODAY_DATE = '';
  CURRENT_DATETIME = '';
  SESSION_LOGS = [];
  USER_EMAIL = this.ENVIRONMENT === 'production' ? this.getUserEmail() : '';
  PROPERTY_DIVIDER = ` | `;
  MIN_HOURS_BETWEEN_NOTIFICATIONS: 2;
  APPS_SCRIPTS_PROPERTIES = {
    lastNotify: 'LAST_NOTIFY'
  };
  ERRORS = {
    productionOnly: 'This method cannot run in non-production environments',
    mustSpecifyConfig: 'You must specify the settings when starting the class',
    httpsError: 'You provided an invalid ICS calendar link: '
  };

  constructor(public config: Config) {
    this.validateConfigs(config);
    this.config = config;
    this.TODAY_DATE = this.getDateFixedByTimezone(this.config.settings.timeZoneCorrection).toISOString().split('T')[0];
    this.logger(`${this.APPNAME} is running at version ${this.VERSION} in ${this.ENVIRONMENT} environment`);
    this.logger(`check the docs for your version here: ${`https://github.com/${this.GITHUB_REPOSITORY}/tree/v${this.VERSION}#readme`}`);
  }

  private validateConfigs(config: Config) {
    if (!config) {
      throw new Error(this.ERRORS.mustSpecifyConfig);
    }

    // prettier-ignore
    const validationArr = [
      { objToCheck: config, requiredKeys: ['twitch', 'settings'], name: 'configs' },
      { objToCheck: config.twitch, requiredKeys: ['channels', 'disabledHours', 'ignoredWords', ], name: 'configs.twitch' },
      { objToCheck: config.settings, requiredKeys: ['timeZoneCorrection', 'checkFunction', 'minutesBetweenChecks'], name: 'configs.settings' },
    ];

    validationArr.forEach((item) => {
      const { objToCheck, requiredKeys, name } = item;
      requiredKeys.forEach((key) => {
        if (!objToCheck || !Object.keys(objToCheck).includes(key)) {
          throw new Error(`missing key in ${name}: ${key}`);
        }
      });
    });
  }

  private detectEnvironment(): Environment {
    if (typeof Calendar === 'undefined') {
      return 'development';
    } else {
      return 'production';
    }
  }

  private logger(message: string) {
    this.SESSION_LOGS.push(message);
    console.log(message);
  }

  /* HELPER FUNCTIONS ======================================================= */

  private getDateFixedByTimezone(timeZoneIndex: number) {
    const date = new Date();
    date.setHours(date.getHours() + timeZoneIndex);
    return date;
  }

  /* GOOGL APSS SCRIPT EMAIL ================================================ */

  private getUserEmail() {
    return Session.getActiveUser().getEmail();
  }

  /* ======================================================================== */

  check() {
    this.addMissingProperties();
    const channelsInfo = this.getChannelsInformation();
    const channelsToNotify = this.getChannelsToNotify(channelsInfo);

    if (channelsToNotify.length > 0) {
      this.sendEmail(channelsToNotify);
      this.updateNotifiedChannels(channelsToNotify);
      this.logger(`notified about ${channelsToNotify.length} live streamers`);
    } else {
      this.logger('no streamers went live recently');
      this.logger(this.showNextChannelsToNotify(channelsInfo));
    }
  }

  setup() {
    this.logger('installed looping');
    this.addAppsScriptsTrigger(this.config.settings.checkFunction, this.config.settings.minutesBetweenChecks);
    this.addMissingProperties();
  }

  uninstall() {
    this.logger('uninstalled looping');
    this.removeAppsScriptsTrigger(this.config.settings.checkFunction);
    this.removeAppsScriptProperty(this.APPS_SCRIPTS_PROPERTIES.lastNotify);
  }

  addMissingProperties() {
    if (!this.getAppsScriptProperty(this.APPS_SCRIPTS_PROPERTIES.lastNotify)) {
      this.updateAppsScriptProperty(this.APPS_SCRIPTS_PROPERTIES.lastNotify, '');
    }
  }

  /* ======================================================================== */

  /* APPS SCRIPT PROPERTY FUNCTIONS ----------------------------------------- */

  removeAppsScriptProperty(property: string) {
    return PropertiesService.getScriptProperties().deleteProperty(property);
  }

  getAppsScriptProperty(property: string) {
    return PropertiesService.getScriptProperties().getProperty(property);
  }

  updateAppsScriptProperty(property: string, newContent: string) {
    return PropertiesService.getScriptProperties().setProperty(property, newContent);
  }

  /* GOOGLE APPS SCRIPTS TRIGGERS ------------------------------------------- */

  addAppsScriptsTrigger(functionName: string, minutesLoop: number) {
    const tickSyncTrigger = ScriptApp.getProjectTriggers().find((item) => item.getHandlerFunction() === functionName);

    if (tickSyncTrigger) {
      this.removeAppsScriptsTrigger(functionName);
    }

    ScriptApp.newTrigger(functionName).timeBased().everyMinutes(minutesLoop).create();
  }

  removeAppsScriptsTrigger(functionName: string) {
    const tickSyncTrigger = ScriptApp.getProjectTriggers().find((item) => item.getHandlerFunction() === functionName);

    if (tickSyncTrigger) {
      ScriptApp.deleteTrigger(tickSyncTrigger);
    }
  }

  /* DATE TIME FUNCTIONS ---------------------------------------------------- */

  getDatefixedByTimezone(date: Date) {
    const diffHoursFromUtc = -3;
    date.setHours(date.getHours() + diffHoursFromUtc);
    return date;
  }

  getMinutesDiff(dateOne: Date, dateTwo: Date) {
    const minutes = Math.floor(Math.abs(Number(this.getDatefixedByTimezone(new Date(dateTwo))) - Number(this.getDatefixedByTimezone(new Date(dateOne)))) / 1000 / 60);
    return minutes;
  }

  /* TWITCH FUNCTIONS ------------------------------------------------------- */

  getTwitchLink(channel: string) {
    return `https://www.twitch.tv/${channel}`;
  }

  getTwitchStreamCompleteInfo(channel: string) {
    const response = UrlFetchApp.fetch(this.getTwitchLink(channel));
    const bodyContent = response.getContentText();
    const streamInfoData = this.extractLiveInformation(bodyContent, channel);
    return streamInfoData;
  }

  extractLiveInformation(htmlContent: string, channel: string) {
    let data = htmlContent.split('<script type="application/ld+json">')[1];
    let image = '';

    if (data) {
      image = htmlContent.split('content="https://static-cdn')[1];
      image = 'https://static-cdn' + image.split('"')[0];
      data = data.split('</script>')[0];
      data = JSON.parse(data);
      data = data[0];
    }

    const dataObject: any = data;
    const streamLiveStartDatetime = dataObject ? this.getDatefixedByTimezone(new Date(dataObject.uploadDate)).toISOString() : '';
    const uptime = this.getMinutesDiff(new Date(this.CURRENT_DATETIME), new Date(streamLiveStartDatetime));

    const parsedData: ChannelWithInfo = {
      streamName: channel,
      streamLink: this.getTwitchLink(channel),
      streamImage: image,
      streamIsLive: dataObject?.publication.isLiveBroadcast ?? false,
      streamLiveDescription: dataObject?.description ?? '',
      streamLivePreviewImage: dataObject?.thumbnailUrl[2] ?? '',
      streamLiveStartDatetime: streamLiveStartDatetime,
      streamLiveUptimeMinutes: uptime,
      streamLiveUptimeParsed: uptime > 60 ? `${Math.trunc(uptime / 60)} hours<br>${uptime - Math.trunc(uptime / 60) * 60} minutes` : isNaN(uptime) === false ? `${uptime} minutes` : ''
    };

    return parsedData;
  }

  /* EMAIL FUNCTIONS -------------------------------------------------------- */

  generateEmailContent(chanArr: ChannelWithInfo[]) {
    let emailHtml = '';

    const tableStyle = `style="border: 1px solid #333; width: 90%"`;
    const tableRowStyle = `style="width: 100%; text-align: center;"`;
    const tableRowColumnStyle = `style="border: 1px solid #333"`;

    const header = `<tr ${tableRowStyle}">\n<th ${tableRowColumnStyle} width="100px">channel</th><th ${tableRowColumnStyle} width="100px">uptime</th><th ${tableRowColumnStyle} width="auto">details</th>\n</tr>`;

    const getTableBodyItemsHtml = () => {
      return chanArr
        .map(
          (item) =>
            `<tr ${tableRowStyle}">\n${[
              `<div style="text-align: center;"><a href="${item.streamLink}"><img src="${item.streamImage}" width="80" style="border-radius: 50%"></a><br><a href="${item.streamLink}">${item.streamName}</a></div>`,
              `${item.streamLiveUptimeParsed}`,
              `<div>${`<img src="${item.streamLivePreviewImage}" width="60%">`}<br><p>${item.streamLiveDescription}</p></div>`
            ]
              .map((it) => `<td ${tableRowColumnStyle}>&nbsp;&nbsp;${it}</td>`)
              .join('\n')}\n</tr>`
        )
        .join('');
    };

    const table = `<center>\n<table ${tableStyle}>\n${header}\n${getTableBodyItemsHtml()}\n</table>\n</center>`;

    emailHtml = emailHtml + `Hi,<br><br>\n`;
    emailHtml = emailHtml + `${chanArr.length === 1 ? `${chanArr[0].streamName} is live:` : 'the following channels are live:'} <br><br>\n`;
    emailHtml = emailHtml + `${table}<br>\n`;
    emailHtml = emailHtml + `Regards, <br>your <a href="https://github.com/lucasvtiradentes/twitch-notifier#readme"><b>twitch notifier</b></a> bot`;

    return emailHtml;
  }

  /* SECONDARY FUNCTIONS ---------------------------------------------------- */

  channelsToIgnoreIfTheyAreLive() {
    const onlyValidItems = this.getLastNotifiedChannels()
      .filter((item) => {
        const diffMinutes = this.getMinutesDiff(this.getDatefixedByTimezone(new Date()), new Date(item[1]));
        const minutesToCompare = this.MIN_HOURS_BETWEEN_NOTIFICATIONS * 60;
        return diffMinutes < minutesToCompare;
      })
      .map((item) => item[0]);
    return onlyValidItems;
  }

  /* MAIN FUNCTIONS --------------------------------------------------------- */

  getChannelsInformation() {
    const channelsWithInfoArr = this.config.twitch.channels.map((item) => item[0]).map((channel: string) => this.getTwitchStreamCompleteInfo(channel));
    return channelsWithInfoArr;
  }

  getChannelsToNotify(channelsWithInfoArr: ChannelWithInfo[]) {
    // (neverNotified || startedLive < 60) && isOnline && last notification > MIN_HOURS_BETWEEN_NOTIFICATION

    const lastNotified = this.getAppsScriptProperty(this.APPS_SCRIPTS_PROPERTIES.lastNotify);
    const lastValidNotifiedItems =
      lastNotified === ''
        ? []
        : lastNotified
            .split('\n')
            .filter((item) => item.length > 0)
            .map((item) => item.split(this.PROPERTY_DIVIDER)[0]);
    const recentStartedLiveChannels = channelsWithInfoArr.filter((channelInfo) => {
      const isChannelAlreadyNotified = lastValidNotifiedItems.includes(channelInfo.streamName);
      const result = !isChannelAlreadyNotified ? true : channelInfo.streamLiveUptimeMinutes < 60;
      return result;
    });
    const onlineChannels = recentStartedLiveChannels.filter((channelInfo) => channelInfo.streamIsLive);
    const nonIgnoreChannels = onlineChannels.filter((channelInfo) => this.channelsToIgnoreIfTheyAreLive().includes(channelInfo.streamName) === false);
    const channelsToNotify = nonIgnoreChannels;
    return channelsToNotify;
  }

  getLastNotifiedChannels() {
    const oldNotifications = this.getAppsScriptProperty(this.APPS_SCRIPTS_PROPERTIES.lastNotify);
    const oldNotificationsArr = oldNotifications.split('\n').map((item) => item.split(this.PROPERTY_DIVIDER));
    return oldNotificationsArr;
  }

  updateNotifiedChannels(channelsToNotify: ChannelWithInfo[]) {
    const notifiedChannels = this.getLastNotifiedChannels();
    const nonNotifiedOldChannels = notifiedChannels.filter((item) => channelsToNotify.map((item) => item.streamName).includes(item[0]) === false);
    const newNotifiedChannels = channelsToNotify.map((item) => [item.streamName, this.CURRENT_DATETIME]);
    const newPropertyStr = [...nonNotifiedOldChannels, ...newNotifiedChannels]
      .map((item) => item.join(this.PROPERTY_DIVIDER))
      .filter((row) => row.length > 0)
      .join('\n');

    this.updateAppsScriptProperty(this.APPS_SCRIPTS_PROPERTIES.lastNotify, newPropertyStr);
  }

  showNextChannelsToNotify(channelsWithInfo: ChannelWithInfo[]) {
    const channels = channelsWithInfo.map((item) => [item.streamName, item.streamIsLive, item.streamLiveUptimeMinutes]).sort((a, b) => Number(b[1]) - Number(a[1]));
    const maxStringLength = Math.max(...channels.map((item) => item[0].toString().length));
    const parsedChannels = channels.map((item) => `${item[0]}${' '.repeat(maxStringLength - item[0].toString().length)} - ${item[1] ? 'online ' : 'offline'}${isNaN(Number(item[2])) ? '' : ' - ' + Number(Number(item[2]) / 60).toFixed(2) + ' hours'}`).join('\n');
    return parsedChannels;
  }

  sendEmail(channels: ChannelWithInfo[]) {
    const singleChannelLive = `Twitch notifier - ${channels[0].streamName} is live`;
    const multiChannelsLive = `Twitch notifier - ${channels.length} channels live: ${channels
      .map((item) => item.streamName)
      .slice(0, 5)
      .join(', ')}`;

    MailApp.sendEmail({
      to: this.USER_EMAIL,
      subject: channels.length === 1 ? singleChannelLive : multiChannelsLive,
      htmlBody: this.generateEmailContent(channels)
    });
  }
}
