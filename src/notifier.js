/* CONFIGS ================================================================== */

const CONFIGS = {
  channels: ['razah', 'lucasvtiradentes', 'mch_agg'],
  diffHoursFromUTCTimezone: -3
}

/* HELPER =================================================================== */

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

function sendEmail(channels){
  console.log(channels);
  // MailApp.sendEmail({
  //   to: "lucasvtiradentes@gmail.com",
  //   subject: "Razah tá online",
  //   htmlBody: "Oi, <br> <br>" + `O razão tá online: ${getTwitchLink(channel)}`
  // });
}

/* MAIN ===================================================================== */

function checkChannels(){
  const onlineChannels = CONFIGS.filter(channel => isTwitchStreamChannelLive(channel))
  console.log(onlineChannels);
}

/* OTHER ==================================================================== */

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
