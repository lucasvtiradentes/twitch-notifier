type ChannelOption = {
  ignoredWords?: string[];
  searchedWords?: string[];
};

type ChannelRow = [string, ChannelOption];

type Config = {
  twitch: {
    channels: ChannelRow[];
    ignoredWords: string[];
  };
  settings: {
    timeZoneCorrection: number;
    minutesBetweenChecks: number;
    disabledHours: number[];
    checkFunction: string;
  };
};

type NotifiedTwitchStreamName = string;
type NotifiedTwitchStreamDatetime = string;
type NotifiedTwitchStream = [NotifiedTwitchStreamName, NotifiedTwitchStreamDatetime];

type Environment = 'google_apps_script' | 'browser' | 'nodejs';

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
  private VERSION = ''; // version
  private APPNAME = 'twitch-notifier';
  private GITHUB_REPOSITORY = 'lucasvtiradentes/twitch-notifier';
  private ENVIRONMENT = this.detectEnvironment();
  private CURRENT_DATETIME = this.getDatefixedByTimezone(new Date()).toISOString();
  private SESSION_LOGS = [];
  private USER_EMAIL = this.getUserEmail();
  private PROPERTY_DIVIDER = ` | `;
  private MIN_HOURS_BETWEEN_NOTIFICATIONS: 2;
  private APPS_SCRIPTS_PROPERTIES = {
    lastNotify: 'LAST_NOTIFY'
  };
  private ERRORS = {
    productionOnly: 'This method cannot run in non-production environments',
    mustSpecifyConfig: 'You must specify the settings when starting the class',
    httpsError: 'You provided an invalid ICS calendar link: '
  };

  constructor(private config: Config) {
    this.validateConfigs(config);
    this.config = config;
    this.logger(`${this.APPNAME} is running at version ${this.VERSION} in ${this.ENVIRONMENT} environment`);
    this.logger(`check the docs for your version here: ${`https://github.com/${this.GITHUB_REPOSITORY}/tree/v${this.VERSION}#readme`}`);
  }

  /* VALIDATION FUNCTION ==================================================== */

  private validateConfigs(config: Config) {
    if (!config) {
      throw new Error(this.ERRORS.mustSpecifyConfig);
    }

    // prettier-ignore
    const validationArr = [
      { objToCheck: config, requiredKeys: ['twitch', 'settings'], name: 'configs' },
      { objToCheck: config.twitch, requiredKeys: ['channels', 'ignoredWords', ], name: 'configs.twitch' },
      { objToCheck: config.settings, requiredKeys: ['timeZoneCorrection', 'disabledHours', 'checkFunction', 'minutesBetweenChecks'], name: 'configs.settings' },
    ];

    validationArr.forEach((item) => {
      const { objToCheck, requiredKeys, name } = item;
      requiredKeys.forEach((key) => {
        if (!objToCheck || !Object.keys(objToCheck).includes(key)) {
          throw new Error(`missing key in ${name}: ${key}`);
        }
      });
    });

    this.config.twitch.channels.forEach((channel) => {
      if (channel[1].ignoredWords && channel[1].searchedWords) {
        throw new Error(`you must specify only one filter parameter in channel [${channel[0]}]: ignoredWords OR searchedWords`);
      }
    });
  }

  /* HELPER FUNCTIONS ======================================================= */

  private detectEnvironment(): Environment {
    if (typeof MailApp === 'object') {
      return 'google_apps_script';
    } else if (typeof window === 'object') {
      return 'browser';
    } else {
      return 'nodejs';
    }
  }

  private logger(message: string) {
    this.SESSION_LOGS.push(message);
    console.log(message);
  }

  private getDateFixedByTimezone(timeZoneIndex: number) {
    const date = new Date();
    date.setHours(date.getHours() + timeZoneIndex);
    return date;
  }

  private getDatefixedByTimezone(date: Date) {
    const diffHoursFromUtc = -3;
    date.setHours(date.getHours() + diffHoursFromUtc);
    return date;
  }

  private getMinutesDiff(dateOne: Date, dateTwo: Date) {
    const minutes = Math.floor(Math.abs(Number(this.getDatefixedByTimezone(new Date(dateTwo))) - Number(this.getDatefixedByTimezone(new Date(dateOne)))) / 1000 / 60);
    return minutes;
  }

  /* SPECIAL FUNCTIONS ====================================================== */

  private getScriptFunction() {
    if (this.ENVIRONMENT !== 'google_apps_script') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return ScriptApp;
  }

  private getPropertyFunction() {
    if (this.ENVIRONMENT !== 'google_apps_script') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return PropertiesService;
  }

  private getFetchFunction() {
    if (this.ENVIRONMENT !== 'google_apps_script') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return UrlFetchApp.fetch;
  }

  private getEmailFunction() {
    if (this.ENVIRONMENT !== 'google_apps_script') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return MailApp.sendEmail;
  }

  /* ======================================================================== */

  private getContent(url: string): Promise<string> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('https').get(url, (res) => {
        let finalContent = '';

        res.on('data', (d) => {
          finalContent += d;
        });

        res.on('end', () => {
          resolve(finalContent);
        });
      });
    });
  }

  private async getPageContent(url: string) {
    let htmlContent = '';
    if (this.ENVIRONMENT === 'google_apps_script') {
      const fetchFunction = this.getFetchFunction();
      const response = fetchFunction(url);
      htmlContent = response.getContentText();
    } else if (this.ENVIRONMENT === 'nodejs') {
      htmlContent = await this.getContent(url);
    }
    return htmlContent;
  }

  /* EMAIL FUNCTIONS ======================================================== */

  private generateEmailContent(chanArr: ChannelWithInfo[]) {
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

  private getUserEmail() {
    return this.ENVIRONMENT === 'google_apps_script' ? Session.getActiveUser().getEmail() : '';
  }

  private sendEmail(channels: ChannelWithInfo[]) {
    const singleChannelLive = `Twitch notifier - ${channels[0].streamName} is live`;
    const multiChannelsLive = `Twitch notifier - ${channels.length} channels live: ${channels
      .map((item) => item.streamName)
      .slice(0, 5)
      .join(', ')}`;

    const emailFunction = this.getEmailFunction();
    emailFunction({
      to: this.USER_EMAIL,
      subject: channels.length === 1 ? singleChannelLive : multiChannelsLive,
      htmlBody: this.generateEmailContent(channels)
    });
  }

  /* GOOGLE APPS SCRIPT TRIGGER FUNCTIONS =================================== */

  private addAppsScriptsTrigger(functionName: string, minutesLoop: number) {
    const scriptFunction = this.getScriptFunction();
    const tickSyncTrigger = scriptFunction.getProjectTriggers().find((item) => item.getHandlerFunction() === functionName);

    if (tickSyncTrigger) {
      this.removeAppsScriptsTrigger(functionName);
    }

    scriptFunction.newTrigger(functionName).timeBased().everyMinutes(minutesLoop).create();
  }

  private removeAppsScriptsTrigger(functionName: string) {
    const scriptFunction = this.getScriptFunction();
    const tickSyncTrigger = scriptFunction.getProjectTriggers().find((item) => item.getHandlerFunction() === functionName);

    if (tickSyncTrigger) {
      scriptFunction.deleteTrigger(tickSyncTrigger);
    }
  }

  /* GOOGLE APPS SCRIPT PROPERTY FUNCTIONS ================================== */

  private removeAppsScriptProperty(property: string) {
    return this.getPropertyFunction().getScriptProperties().deleteProperty(property);
  }

  private getAppsScriptProperty(property: string) {
    return this.getPropertyFunction().getScriptProperties().getProperty(property);
  }

  private updateAppsScriptProperty(property: string, newContent: string) {
    return this.getPropertyFunction().getScriptProperties().setProperty(property, newContent);
  }

  private addMissingProperties() {
    if (!this.getAppsScriptProperty(this.APPS_SCRIPTS_PROPERTIES.lastNotify)) {
      this.updateAppsScriptProperty(this.APPS_SCRIPTS_PROPERTIES.lastNotify, '');
    }
  }

  /* TWITCH FUNCTIONS ======================================================= */

  private getTwitchLink(channel: string) {
    return `https://www.twitch.tv/${channel}`;
  }

  private async getTwitchStreamCompleteInfo(channel: string) {
    const bodyContent = await this.getPageContent(this.getTwitchLink(channel));
    const streamInfoData = this.extractLiveInformation(bodyContent, channel);
    return streamInfoData;
  }

  private extractLiveInformation(htmlContent: string, channel: string) {
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

  /* NOTIFIED CHANNELS FUNCTIONS ============================================ */

  private updateNotifiedChannels(channelsToNotify: ChannelWithInfo[]) {
    const notifiedChannels = this.getLastNotifiedChannels();
    const nonNotifiedOldChannels = notifiedChannels.filter((item) => channelsToNotify.map((item) => item.streamName).includes(item[0]) === false);
    const newNotifiedChannels: NotifiedTwitchStream[] = channelsToNotify.map((item) => [item.streamName, this.CURRENT_DATETIME]);
    const newPropertyStr = [...nonNotifiedOldChannels, ...newNotifiedChannels]
      .map((item) => item.join(this.PROPERTY_DIVIDER))
      .filter((row) => row.length > 0)
      .join('\n');

    this.updateAppsScriptProperty(this.APPS_SCRIPTS_PROPERTIES.lastNotify, newPropertyStr);
  }

  private showNextChannelsToNotify(channelsWithInfo: ChannelWithInfo[]) {
    const channels = channelsWithInfo.map((item) => [item.streamName, item.streamIsLive, item.streamLiveUptimeMinutes]).sort((a, b) => Number(b[1]) - Number(a[1]));
    const maxStringLength = Math.max(...channels.map((item) => item[0].toString().length));
    const parsedChannels = channels.map((item) => `${item[0]}${' '.repeat(maxStringLength - item[0].toString().length)} - ${item[1] ? 'online ' : 'offline'}${isNaN(Number(item[2])) ? '' : ' - ' + Number(Number(item[2]) / 60).toFixed(2) + ' hours'}`).join('\n');
    return parsedChannels;
  }

  private getLastNotifiedChannels() {
    if (this.ENVIRONMENT !== 'google_apps_script') {
      return [] as NotifiedTwitchStream[];
    }

    const oldNotifications = this.getAppsScriptProperty(this.APPS_SCRIPTS_PROPERTIES.lastNotify);
    const oldNotificationsArr = oldNotifications
      .split('\n')
      .filter((item) => item.length > 0)
      .map((item) => item.split(this.PROPERTY_DIVIDER)) as NotifiedTwitchStream[];
    return oldNotificationsArr;
  }

  /* SECONDARY FUNCTIONS ==================================================== */

  filterStreamersToNotify(channelsWithInfoArr: ChannelWithInfo[]) {
    // (neverNotified || startedLive < 60) && isOnline && last notification > MIN_HOURS_BETWEEN_NOTIFICATION
    let channelsToNotify: ChannelWithInfo[] = [];

    const lastNotified = this.getLastNotifiedChannels();

    // filter only streams that are live
    channelsToNotify = channelsWithInfoArr.filter((channelInfo) => channelInfo.streamIsLive);

    // filter only streams that dont contain any global ignored words
    channelsToNotify = channelsToNotify.filter((channelInfo) => this.config.twitch.ignoredWords.map((igWord) => igWord.toLowerCase()).every((word) => channelInfo.streamLiveDescription.toLowerCase().search(word) === -1));

    // filter only streams that dont contain any specific ignored words
    channelsToNotify = channelsToNotify.filter((channelInfo) => {
      const currentStream = this.config.twitch.channels.find((channel) => channel[0] === channelInfo.streamName);
      return !currentStream[1].ignoredWords ? true : currentStream[1].ignoredWords.map((igWord) => igWord.toLowerCase()).every((word) => channelInfo.streamLiveDescription.toLowerCase().search(word) === -1);
    });

    // filter only streams that contain at least one specific searched words
    channelsToNotify = channelsToNotify.filter((channelInfo) => {
      const currentStream = this.config.twitch.channels.find((channel) => channel[0] === channelInfo.streamName);
      return !currentStream[1].searchedWords ? true : currentStream[1].searchedWords.map((searchedWord) => searchedWord.toLowerCase()).some((word) => channelInfo.streamLiveDescription.toLowerCase().search(word) > -1);
    });

    // filter streams that were (a) were not notified yet or start at maximum 60 minutes ago
    channelsToNotify = channelsToNotify.filter((channelInfo) => {
      const isChannelAlreadyNotified = lastNotified.map((item) => item[0]).includes(channelInfo.streamName);
      const result = !isChannelAlreadyNotified ? true : channelInfo.streamLiveUptimeMinutes < 60;
      return result;
    });

    // filter items that not have been notified in the last two hours
    channelsToNotify = channelsToNotify.filter((channelInfo) => {
      const onlyValidItems = lastNotified
        .filter((item) => {
          const diffMinutes = this.getMinutesDiff(this.getDatefixedByTimezone(new Date()), new Date(item[1]));
          const minutesToCompare = this.MIN_HOURS_BETWEEN_NOTIFICATIONS * 60;
          return diffMinutes < minutesToCompare;
        })
        .map((item) => item[0]);
      return onlyValidItems.includes(channelInfo.streamName) === false;
    });

    return channelsToNotify;
  }

  /* MAIN FUNCTIONS ========================================================= */

  async getTwichStreamersData() {
    const channelsWithInfoArr = await Promise.all(
      this.config.twitch.channels
        .map((item) => item[0])
        .map(async (channel: string) => {
          return await this.getTwitchStreamCompleteInfo(channel);
        })
    );

    return channelsWithInfoArr;
  }

  async check() {
    const currentHour = Number(this.CURRENT_DATETIME.split('T')[1].split(':')[0]);
    console.log(currentHour);

    if (this.config.settings.disabledHours.includes(currentHour)) {
      this.logger(`skipping run since it [${currentHour}] is a disable hour`);
      return;
    }
    this.addMissingProperties();

    const channelsInfo = await this.getTwichStreamersData();
    const channelsToNotify = this.filterStreamersToNotify(channelsInfo);

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
}
