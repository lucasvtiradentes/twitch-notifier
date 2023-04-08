const CONFIGS = {
  channels: ['razah', 'theprimeagen']
}

/* MAIN ========================================================================================= */

function check(){

  const {
    showNextChannelsToNotify,
    getChannelsInformation,
    getChannelsToNotify,
    sendEmail,
    updateNotifiedChannels
  } = helperFunctions()


  const channelsInfo = getChannelsInformation(CONFIGS)
  const channelsToNotify = getChannelsToNotify(channelsInfo)

  if (channelsToNotify.length > 0){
    sendEmail(channelsToNotify)
    updateNotifiedChannels(channelsToNotify)
    console.log(`notified about ${channelsToNotify.length} live streamers`)
  } else {
    console.log("no streamers went live recently")
    console.log(showNextChannelsToNotify(channelsInfo))
  }
}

function setup(){
  const { installLoop } = helperFunctions()
  installLoop()
}

function uninstall(){
  const { uninstallLoop } = helperFunctions()
  uninstallLoop()
}

/* HELPER ======================================================================================= */

function helperFunctions(){

  const CONSTANTS = {
    APP_NAME: 'twitch-notifier',
    APP_LINK: 'https://github.com/lucasvtiradentes/twitch-notifier#readme',
    USER_EMAIL: Session.getActiveUser().getEmail(),
    LAST_NOTIFY_PROPERTY: 'LAST_NOTIFY',
    PROPERTY_DIVIDER: ' | ',
    MIN_HOURS_BETWEEN_NOTIFICATION: 2,
    CUR_DATETIME: getDatefixedByTimezone(new Date()).toISOString(),
    MINUTES_BETWEEN_CHECK: 10
  }

  /* ERROR HANDLING FUNCTIONS ----------------------------------------------- */

  addMissingProperties()

  function addMissingProperties(){
    if (!getAppsScriptProperty(CONSTANTS.LAST_NOTIFY_PROPERTY)){
      updateAppsScriptProperty(CONSTANTS.LAST_NOTIFY_PROPERTY, '')
    }
  }

  /* APPS SCRIPT PROPERTY FUNCTIONS ----------------------------------------- */

  function removeAppsScriptProperty(property){
    return PropertiesService.getScriptProperties().deleteProperty(property);
  }

  function getAppsScriptProperty(property){
    return PropertiesService.getScriptProperties().getProperty(property);
  }

  function updateAppsScriptProperty(property, newContent){
    return PropertiesService.getScriptProperties().setProperty(property, newContent);
  }

  /* GOOGLE APPS SCRIPTS TRIGGERS ------------------------------------------- */

  function addAppsScriptsTrigger(functionName, minutesLoop) {
    const tickSyncTrigger = ScriptApp.getProjectTriggers().find((item) => item.getHandlerFunction() === functionName);

    if (tickSyncTrigger) {
      removeAppsScriptsTrigger(functionName)
    }

    ScriptApp.newTrigger(functionName).timeBased().everyMinutes(minutesLoop).create();
  }

  function removeAppsScriptsTrigger(functionName) {
    const tickSyncTrigger = ScriptApp.getProjectTriggers().find((item) => item.getHandlerFunction() === functionName);

    if (tickSyncTrigger) {
      ScriptApp.deleteTrigger(tickSyncTrigger);
    }
  }

  /* DATE TIME FUNCTIONS ---------------------------------------------------- */

  function getDatefixedByTimezone(date){
    const diffHoursFromUtc = -3
    date.setHours(date.getHours() + diffHoursFromUtc);
    return date
  }

  function getMinutesDiff(dateOne, dateTwo){
    const minutes = Math.floor((Math.abs(getDatefixedByTimezone(new Date(dateTwo)) - getDatefixedByTimezone(new Date(dateOne)))/1000)/60)
    return minutes
  }

  /* TWITCH FUNCTIONS ------------------------------------------------------- */

  function getTwitchLink(channel){
    return `https://www.twitch.tv/${channel}`
  }

  function getTwitchStreamCompleteInfo(channel){
    const response = UrlFetchApp.fetch(getTwitchLink(channel));
    const bodyContent = response.getContentText()
    const streamInfoData = extractLiveInformation(bodyContent, channel)
    return streamInfoData
  }

  function extractLiveInformation(htmlContent, channel){

    let data = htmlContent.split('<script type="application/ld+json">')[1]
    let image = ''

    if (data){
      image = htmlContent.split('content="https://static-cdn')[1]
      image = "https://static-cdn" + image.split('"')[0]
      data = data.split('</script>')[0]
      data = JSON.parse(data)
      data = data[0]
    }

    const streamLiveStartDatetime = data ? getDatefixedByTimezone(new Date(data.uploadDate)).toISOString() : ''
    const uptime = getMinutesDiff(new Date(CONSTANTS.CUR_DATETIME), new Date(streamLiveStartDatetime))

    const parsedData = {
      streamName: channel,
      streamLink: getTwitchLink(channel),
      streamImage: image,
      streamIsLive: data?.publication.isLiveBroadcast ?? false,
      streamLiveDescription: data?.description ?? '',
      streamLivePreviewImage: data?.thumbnailUrl[2] ?? '',
      streamLiveStartDatetime: streamLiveStartDatetime,
      streamLiveUptimeMinutes: uptime,
      streamLiveUptimeParsed: uptime > 60 ? `${Math.trunc(uptime/60)} hours<br>${uptime - (Math.trunc(uptime/60) * 60)} minutes` : isNaN(uptime) === false ? `${uptime} minutes` : ''
    }

    return parsedData
  }

  /* EMAIL FUNCTIONS -------------------------------------------------------- */

  function generateEmailContent(chanArr){
      let emailHtml = ''

      const tableStyle = `style="border: 1px solid #333; width: 90%"`;
      const tableRowStyle = `style="width: 100%; text-align: center;"`;
      const tableRowColumnStyle = `style="border: 1px solid #333"`;

      const header = `<tr ${tableRowStyle}">\n<th ${tableRowColumnStyle} width="100px">channel</th><th ${tableRowColumnStyle} width="100px">uptime</th><th ${tableRowColumnStyle} width="auto">details</th>\n</tr>`;

      const getTableBodyItemsHtml = () => {
        return chanArr.map(item => `<tr ${tableRowStyle}">\n${[`<div style="text-align: center;"><a href="${item.streamLink}"><img src="${item.streamImage}" width="80" style="border-radius: 50%"></a><br><a href="${item.streamLink}">${item.streamName}</a></div>`, `${item.streamLiveUptimeParsed}`, `<div>${`<img src="${item.streamLivePreviewImage}" width="60%">`}<br><p>${item.streamLiveDescription}</p></div>`].map(it => `<td ${tableRowColumnStyle}>&nbsp;&nbsp;${it}</td>`).join('\n')}\n</tr>`).join("")
      }

      const table = `<center>\n<table ${tableStyle}>\n${header}\n${getTableBodyItemsHtml()}\n</table>\n</center>`

      emailHtml = emailHtml + `Hi,<br><br>\n`
      emailHtml = emailHtml + `${chanArr.length === 1 ? `${chanArr[0].streamName} is live:` : 'the following channels are live:'} <br><br>\n`
      emailHtml = emailHtml + `${table}<br>\n`
      emailHtml = emailHtml + `Regards, <br>your <a href="https://github.com/lucasvtiradentes/twitch-notifier#readme"><b>twitch notifier</b></a> bot`

      return emailHtml
  }

  /* SECONDARY FUNCTIONS ---------------------------------------------------- */

  function channelsToIgnoreIfTheyAreLive(){
    const onlyValidItems = getLastNotifiedChannels().filter(item => {
      const diffMinutes = getMinutesDiff(getDatefixedByTimezone(new Date()), new Date(item[1]))
      const minutesToCompare = CONSTANTS.MIN_HOURS_BETWEEN_NOTIFICATION * 60
      return diffMinutes < minutesToCompare
    }).map(item => item[0])
    return onlyValidItems
  }

  /* MAIN FUNCTIONS --------------------------------------------------------- */

  function installLoop(){
    console.log("installed looping")
    addAppsScriptsTrigger('check', CONSTANTS.MINUTES_BETWEEN_CHECK)
    addMissingProperties()
  }

  function uninstallLoop(){
    console.log("uninstalled looping")
    removeAppsScriptsTrigger('check')
    removeAppsScriptProperty(CONSTANTS.LAST_NOTIFY_PROPERTY)
  }

  function getChannelsInformation(conf){
    const channelsWithInfoArr = conf.channels.map(channel => getTwitchStreamCompleteInfo(channel))
    return channelsWithInfoArr
  }

  function getChannelsToNotify(channelsWithInfoArr){
    // (neverNotified || startedLive < 60) && isOnline && last notification > MIN_HOURS_BETWEEN_NOTIFICATION

    const lastNotified = getAppsScriptProperty(CONSTANTS.LAST_NOTIFY_PROPERTY)
    const lastValidNotifiedItems = lastNotified === '' ? [] : lastNotified.split('\n').filter(item => item.length > 0).map(item => item.split(CONSTANTS.PROPERTY_DIVIDER)[0])
    const recentStartedLiveChannels = channelsWithInfoArr.filter(channelInfo => {
      const isChannelAlreadyNotified = lastValidNotifiedItems.includes(channelInfo.streamName)
      const result = !isChannelAlreadyNotified ? true : channelInfo.streamLiveUptimeMinutes < 60
      return result
    })
    const onlineChannels = recentStartedLiveChannels.filter(channelInfo => channelInfo.streamIsLive)
    const nonIgnoreChannels = onlineChannels.filter(channelInfo => channelsToIgnoreIfTheyAreLive().includes(channelInfo.streamName) === false)
    const channelsToNotify = nonIgnoreChannels
    return channelsToNotify
  }

  function getLastNotifiedChannels(){
    const oldNotifications = getAppsScriptProperty(CONSTANTS.LAST_NOTIFY_PROPERTY)
    const oldNotificationsArr = oldNotifications.split('\n').map(item => item.split(CONSTANTS.PROPERTY_DIVIDER))
    return oldNotificationsArr
  }

  function updateNotifiedChannels(channelsToNotify){
    const notifiedChannels = getLastNotifiedChannels()
    const nonNotifiedOldChannels = notifiedChannels.filter(item => channelsToNotify.map(item => item.streamName).includes(item[0]) === false)
    const newNotifiedChannels = channelsToNotify.map(item => [item.streamName, CONSTANTS.CUR_DATETIME])
    const newPropertyStr = [...nonNotifiedOldChannels, ...newNotifiedChannels].map(item => item.join(CONSTANTS.PROPERTY_DIVIDER)).filter(row => row.length > 0).join("\n")

    updateAppsScriptProperty(CONSTANTS.LAST_NOTIFY_PROPERTY, newPropertyStr)
  }

  function showNextChannelsToNotify(conf){
    const channels = conf.map(item => [item.streamName, item.streamIsLive, item.streamLiveUptimeMinutes]).sort((a, b) => b[1] - a[1])
    const maxStringLength = Math.max(...channels.map(item => item[0].length))
    const parsedChannels = channels.map(item => `${item[0]}${' '.repeat(maxStringLength - item[0].length)} - ${item[1] ? 'online ' : 'offline'}${isNaN(item[2]) ? '' : ' - ' + Number(item[2]/60).toFixed(2) + ' hours'}`).join('\n')
    return parsedChannels
  }

  function sendEmail(channels){

    const singleChannelLive = `Twitch notifier - ${channels[0].streamName} is live`
    const multiChannelsLive = `Twitch notifier - ${channels.length} channels live: ${channels.map(item => item.streamName).slice(0, 5).join(', ')}`

    MailApp.sendEmail({
      to: CONSTANTS.USER_EMAIL,
      subject: channels.length === 1 ? singleChannelLive : multiChannelsLive,
      htmlBody: generateEmailContent(channels)
    });
  }

  /* EXPORTED FUNCTIONS ----------------------------------------------------- */

  return {
    installLoop,
    uninstallLoop,

    getChannelsInformation,
    getChannelsToNotify,
    getLastNotifiedChannels,
    updateNotifiedChannels,
    showNextChannelsToNotify,

    sendEmail
  }

}
