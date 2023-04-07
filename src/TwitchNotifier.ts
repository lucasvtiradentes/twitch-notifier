/* eslint-disable @typescript-eslint/no-unused-vars */

type Config = {
  timeZoneCorrection: number;
  streamers: string[];
};

type Environment = 'production' | 'development';

class TwitchNotifier {
  public config: Config;

  VERSION = ''; // version
  APPNAME = 'twitch-notifier';
  GITHUB_REPOSITORY = 'lucasvtiradentes/twitch-notifier';
  ENVIRONMENT = this.detectEnvironment();
  TODAY_DATE = '';
  USER_EMAIL = this.ENVIRONMENT === 'production' ? this.getUserEmail() : '';
  APPS_SCRIPT_PROPERTIES: {
    streamers: 'streamers';
  };
  ERRORS = {
    productionOnly: 'This method cannot run in non-production environments',
    mustSpecifyConfig: 'You must specify the settings when starting the class'
  };

  constructor(config: Config) {
    this.validateConfigs(config);
    this.config = config;
    this.TODAY_DATE = this.getDateFixedByTimezone(this.config.timeZoneCorrection).toISOString().split('T')[0];
    this.logger(`${this.APPNAME} is running at version ${this.VERSION} in ${this.ENVIRONMENT} environment`);
    this.logger(`check the docs for your version here: ${`https://github.com/${this.GITHUB_REPOSITORY}/tree/v${this.VERSION}#readme`}`);
  }

  private validateConfigs(config: Config) {
    if (!config) {
      throw new Error(this.ERRORS.mustSpecifyConfig);
    }

    const validationArr = [{ objToCheck: config, requiredKeys: ['timeZoneCorrection', 'streamers'], name: 'configs' }];

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
    console.log(message);
  }

  /* HELPER FUNCTIONS ======================================================= */

  private getDateFixedByTimezone(timeZoneIndex: number) {
    const date = new Date();
    date.setHours(date.getHours() + timeZoneIndex);
    return date;
  }

  private getGoogleSessionObject() {
    if (this.ENVIRONMENT === 'development') {
      throw new Error(this.ERRORS.productionOnly);
    }

    const Obj = Session;
    return Obj;
  }

  private getUserEmail() {
    return this.getGoogleSessionObject().getActiveUser().getEmail();
  }

  /* MAIN FUNCTIONS ========================================================= */
  private getGoogleAppsScriptPropertyObject() {
    if (this.ENVIRONMENT === 'development') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return PropertiesService.getScriptProperties();
  }

  private getProperty(property: string) {
    return this.getGoogleAppsScriptPropertyObject().getProperty(property);
  }

  private updateProperty(property: string, newContent: string) {
    this.getGoogleAppsScriptPropertyObject().setProperty(property, newContent);
  }
  /* MAIN FUNCTIONS ========================================================= */

  private checkChannels() {
    const currentDateTime = this.getDateFixedByTimezone(this.config.timeZoneCorrection).toISOString();
    console.log(currentDateTime);

    const currentStreamerNotifications = this.getProperty(this.APPS_SCRIPT_PROPERTIES.streamers);
    console.log(currentStreamerNotifications);

    Promise.all(this.config.streamers.map((channel) => this.isTwitchStreamChannelLive(channel))).then((values) => {
      const onlineStreams = this.config.streamers.filter((_item, index) => values[index]);
      console.log(onlineStreams);

      if (onlineStreams.length > 0) {
        this.sendEmail(onlineStreams);
      }
    });
  }

  //   const PROPERTIES = PropertiesService.getScriptProperties();
  //   const LAST_DATETIME = PROPERTIES.getProperty('LAST_NOTIFY');
  //   const MINUTES_SINCE_LAST_NOTIFY = Math.floor(Math.abs(Number(this.getDatefixedByTimezone(TIMEZONE_FIXER, new Date(CUR_DATETIME))) - Number(this.getDatefixedByTimezone(TIMEZONE_FIXER, new Date(LAST_DATETIME)))) / 1000 / 60);

  //   if (MINUTES_SINCE_LAST_NOTIFY < 6 * 60) {
  //     console.log(`ignoring since was notified less then 6 hours ago: ${LAST_DATETIME}`);
  //     return;
  //   }

  /* ======================================================================== */

  getTwitchLink(channel: string) {
    return `https://www.twitch.tv/${channel}`;
  }

  isTwitchStreamChannelLive(channel: string) {
    return new Promise((resolve, reject) => {
      const channelUrl = this.getTwitchLink(channel);

      if (this.ENVIRONMENT === 'production') {
        const response = UrlFetchApp.fetch(channelUrl);
        resolve(response.getContentText().includes('isLiveBroadcast'));
      } else {
        fetch(channelUrl).then((data) => {
          data.text().then((dt) => resolve(dt.includes('isLiveBroadcast')));
        });
      }
    });
  }

  sendEmail(channels: string[]) {
    const content = 'Oi, <br> <br>\n' + `<ul>\n${`${channels.map((channel) => `<li>${channel} tá online: ${this.getTwitchLink(channel)}</li>`).join('<br>')}`}\n</ul>`;

    this.logger(`email sent to: ${this.USER_EMAIL}`);

    if (this.ENVIRONMENT === 'production') {
      MailApp.sendEmail({
        to: this.USER_EMAIL,
        subject: `streamers online: ${channels.splice(0, 4).join(', ')}`,
        htmlBody: content
      });
    }
  }
}
