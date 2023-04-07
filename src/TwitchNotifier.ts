/* eslint-disable @typescript-eslint/no-unused-vars */

/*
  function checkIfRazahIsOnline(){

    const TIMEZONE_FIXER = -3
    const PROPERTIES = PropertiesService.getScriptProperties()
    const CUR_DATETIME = getDatefixedByTimezone(TIMEZONE_FIXER).toISOString()
    const LAST_DATETIME = PROPERTIES.getProperty('LAST_NOTIFY')
    const MINUTES_SINCE_LAST_NOTIFY = Math.floor((Math.abs(getDatefixedByTimezone(TIMEZONE_FIXER, new Date(CUR_DATETIME)) - getDatefixedByTimezone(TIMEZONE_FIXER, new Date(LAST_DATETIME)))/1000)/60)

    if (MINUTES_SINCE_LAST_NOTIFY < 6*60){
      console.log(`ignoring since was notified less then 6 hours ago: ${LAST_DATETIME}`)
      return
    }

    const streamsToNotify = ['razah']
    const onlineStreams = streamsToNotify.filter(channel => isTwitchStreamChannelLive(channel))

    if (onlineStreams.length > 0){
      sendEmail(onlineStreams[0])
      PROPERTIES.setProperty('LAST_NOTIFY', CUR_DATETIME);
    }
  }

  function getDatefixedByTimezone(timeZoneIndex, date = new Date()){
    date.setHours(date.getHours() + timeZoneIndex);
    return date
  }
  function getTwitchLink(channel){
    return `https://www.twitch.tv/${channel}`
  }

  function isTwitchStreamChannelLive(channel){
    const response = UrlFetchApp.fetch(getTwitchLink(channel));
    const bodyContent = response.getContentText()
    const isChannelLive = bodyContent.includes('isLiveBroadcast')
    return isChannelLive
  }

  function sendEmail(channel){
    MailApp.sendEmail({
        to: "lucasvtiradentes@gmail.com",
        subject: "Razah tá online",
        htmlBody: "Oi, <br> <br>" +
                  `O razão tá online: ${getTwitchLink(channel)}`
    });
  }
*/

type Config = {
  timeZoneCorrection: number;
  streamers: string[];
};

type Environment = 'production' | 'development';

class GcalSync {
  public config: Config;

  VERSION = ''; // version
  APPNAME = 'twitch-notifier';
  GITHUB_REPOSITORY = 'lucasvtiradentes/twitch-notifier';
  ENVIRONMENT = this.detectEnvironment();
  TODAY_DATE = '';
  USER_EMAIL = this.ENVIRONMENT === 'production' ? this.getUserEmail() : '';
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

  private checkChannels() {
    console.log('channels');
  }
}
