<a name="TOC"></a>

<h3 align="center">
  TWITCH NOTIFIER
</h3>

<div align="center">
  <a href="https://nodejs.org/en/"><img src="https://img.shields.io/badge/made%20with-node-1f425f?logo=node.js&.svg" /></a>
  <a href="https://www.google.com/script/start/"><img src="https://img.shields.io/badge/apps%20script-4285F4?logo=google&logoColor=white" /></a>
  <a href="https://github.com/lucasvtiradentes/twitch-notifier#contributing"><img src="https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat" alt="contributions" /></a>
  <br>
  <a href="https://www.npmjs.com/package/twitch-notifier"><img src="https://img.shields.io/npm/v/twitch-notifier.svg?style=flat" alt="npm version"></a>
  <a href="https://github.com/lucasvtiradentes/twitch-notifier/actions/workflows/ci-cd.yml"><img src="https://github.com/lucasvtiradentes/twitch-notifier/workflows/CI/badge.svg"/></a>
</div>

<p align="center">
  <a href="#dart-features">Features</a> • <a href="#warning-requirements">Requirements</a> • <a href="#bulb-usage">Usage</a> • <a href="#wrench-development">Development</a>  • <a href="#books-about">About</a>
</p>

<details>
  <summary align="center"><span>see <b>table of content</b></span></summary>
  <p align="center">
    <ul>
      <li><a href="#trumpet-overview">Overview</a></li>
      <li><a href="#dart-features">Features</a></li>
      <li><a href="#warning-requirements">Requirements</a></li>
      <li>
        <a href="#bulb-usage">Usage</a>
        <ul>
          <li><a href="#how-it-works">How it works?</a></li>
          <li><a href="#installation">Installation</a></li>
          <li><a href="#updating">Updating</a></li>
          <li><a href="#uninstall">Uninstall</a></li>
        </ul>
      </li>
      <li>
        <a href="#wrench-development">Development</a>
        <ul>
          <li><a href="#development-setup">Development setup</a></li>
          <li><a href="#used-technologies">Used technologies</a></li>
        </ul>
      </li>
      <li>
        <a href="#books-about">About</a>
        <ul>
          <li><a href="#related">Related</a></li>
          <li><a href="#license">License</a></li>
          <li><a href="#feedback">Feedback</a></li>
        </ul>
      </li>
    </ul>
  </p>
</details>

<a href="#"><img src="./.github/images/divider.png" /></a>

## :trumpet: Overview

Receive an **email** informing whenever your **favorite twitch streamers go live**.

I developed this solution because I find twitch way to [handle notifications](https://www.twitch.tv/settings/notifications) are not so optimized when you follow a lot of streamers, since you have to disable all the ones you don't want to receive notifications, rather than select only the streamers you want to get notified about.

<div align="center">
  <table align="center">
    <thead>
      <tr>
        <td><p align="center">Desktop view</p></td>
        <td><p align="center">Mobile view</p></td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><img width="100%" src="./.github/images/desktop.webp"></td>
        <td><img width="200px" src="./.github/images/mobile.jpeg"></td>
      </tr>
    </tbody>
 </table>
</div>

So this tool allows me to disable all twitch notifications and get notified when my favorite streamers ([razah](https://www.twitch.tv/razah) and [theprimeagen](https://www.twitch.tv/theprimeagen)) go live.

## :dart: Features<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

&nbsp;&nbsp;&nbsp;✔️ receive email informing whenever your favorite streamers go live;<br>
&nbsp;&nbsp;&nbsp;✔️ set custom filtering words to ignore or to consider: you can skip email notification when the live title contains the word 'rerun', for instance.<br>

## :warning: Requirements<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

The only thing you need to use this project is a `gmail/google account`.

## :bulb: Usage<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

### How it works

It basically sets a function to run in [google apps scripts](https://www.google.com/script/start/) to run everyday at a specified time, and this function is responsable for:

- visit each of your favorite streamers twitch link and store the information;
- fitler all the data to only remain the ones you should be notified about, considering your specified options;
- if there's at least one stream to notify you about, send an emain containing the details.

### Installation

To effectively use this project, do the following steps:

<details>
  <summary>1 - create a Google Apps Scripts (GAS) project</summary>
  <div>
    <br>
    <p>Go to the <a href="https://www.google.com/script/start/">google apps script</a> and create a new project by clicking in the button showed in the next image.<br>
    It would be a good idea to rename the project to something like "twitch-notifier".</p>
    <p align="center"><img width="500" src="./.github/images/tutorial/tut2.png" /></p>
  </div>
</details>

<details>
  <summary>2 - setup the twitch-notifier code on GAS</summary>
  <div>
    <br>
    <p>Click on the initial file, which is the <b>rectangle-1</b> on the image.</p>
    <p align="center"><img width="500" src="./.github/images/tutorial/tut3.png" /></p>
    <p>Replace the initial content present in the <b>rectangle-2</b> with the content present in code bellow.</p>
    <blockquote>
      <p><span>⚠️ Warning</span><br>
       Remember to update the <code>CONFIGS</code> object according to your data and needs.</p>
    </blockquote>

<pre>
<!-- <DYNFIELD:GAS_SETUP> -->
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
  const version = "1.0.1"
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
<!-- </DYNFIELD:GAS_SETUP> -->
</pre>
  </div>
</details>

<details>
  <summary>3 - allow the required google permissions</summary>
  <div>
    <br>
    <p>Go to the project settings by clicking on the <b>first image rectangle</b>. After that, check the option to show the <code>appsscript.json</code> in our project, a file that manages the required google api access.</p>
    <div align="center">
      <table>
        <tr>
          <td align="center">
            <img height="300px" src="./.github/images/tutorial/tut4.1.png" />
          </td>
          <td align="center">
            <img width="300px" src="./.github/images/tutorial/tut4.2.png" />
          </td>
        </tr>
      </table>
    </div>
    <p>Go back to the project files, and replace the content present in the <code>appsscript.json</code> with the following code:</p>    <p align="center"><img width="500" src="./.github/images/tutorial/tut5.png" /></p>
    <pre>
<!-- <DYNFIELD:GAS_APPSSCRIPT> -->
{
  "timeZone": "Etc/GMT",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Calendar",
        "serviceId": "calendar",
        "version": "v3"
      }
    ]
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
<!-- </DYNFIELD:GAS_APPSSCRIPT> -->
</pre>
  </div>
</details>

<details>
  <summary>4 - setup the twitch-notifier to run automatically every x minutes</summary>
  <div>
    <br>
    <p>Just follow what the bellow image shows, which is to select the <code>setup</code> function and run it.<br>
    After, a popup will appear asking your permission, and you'll have to accept it.</p>
    <p align="center"><img width="500" src="./.github/images/tutorial/tut6.webp" /></p>
  </div>
</details>

### Updating

To update your twitch-notifier instance and use the latest features, you just need to change the `version` number in the `getTwitchNotifier` function, as it is shown bellow:

<pre>
function getTwitchNotifier(){
  const version = "1.0.0" // update here to use the latest features
  const content = UrlFetchApp.fetch(`https://cdn.jsdelivr.net/npm/twitch-notifier@${version}`).getContentText();
  eval(content)
  const twitchNotifier = new TwitchNotifier(CONFIGS)
  return twitchNotifier;
}
</pre>

So if your instance is running at version "1.0.0" and the latest is "3.6.1", just replace those numbers in the `version` variable.

### Uninstall

If you want to receive the daily emails, just go to the GAS respective project in the header dropdown menu select the `uninstall` function and then click on the `Run` button. By doing that, the GAS trigger responsable for running everyday the function will be deleted.

<a href="#"><img src="./.github/images/divider.png" /></a>

## :wrench: Development<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

### Development setup

<details>
  <summary align="center">Instructions for development setup</summary>
  <div>
<br>
To setup this project in your computer, run the following commands:

```bash
# Clone this repository
$ git clone https://github.com/lucasvtiradentes/twitch-notifier

# Go into the repository
$ cd twitch-notifier

# Install dependencies
$ npm install
```

If you want to [contribute](./docs/CONTRIBUTING.md) to the project, fork the project, make the necessary changes, and to test your work you can load your version in apps scripts with almost no effort do this: replace the content of the <code>getTwitchNotifier</code> function with the following code:

```js
function getTwitchNotifier() {
  // const version = "1.0.1" // version
  // const content = getTwitchNotifierProduction(version)
  const content = getTwitchNotifierDevelopment('yourgithub/project-fork', 'develop');
  eval(content);
  const twitchNotifier = new TwitchNotifier(CONFIGS);
  return twitchNotifier;
}

function getTwitchNotifierProduction(version) {
  return UrlFetchApp.fetch(`https://cdn.jsdelivr.net/npm/twitch-notifier@${version}`).getContentText();
}

function getTwitchNotifierDevelopment(repository, branch) {
  const filePath = 'dist/TwitchNotifier.min.js';
  const final_link = `https://api.github.com/repos/${repository}/contents/${filePath}${branch ? `?ref=${branch}` : ''}`;
  const response = UrlFetchApp.fetch(final_link, { method: 'get', contentType: 'application/json' });
  const base64Content = JSON.parse(response.toString()).content;
  const decodedArr = Utilities.base64Decode(base64Content);
  const decodedAsString = Utilities.newBlob(decodedArr).getDataAsString();
  return decodedAsString;
}
```

This will allow you to select the **twitch-notifier** source place (github repository or npm package) and specify the intended version.

  </div>
</details>

### Used technologies

This project uses the following thechnologies:

<div align="center">
  <table>
    <tr>
      <th>Scope</th>
      <th>Subject</th>
      <th>Technologies</th>
    </tr>
    <tr>
      <td rowspan="1">Project</td>
      <td>Main</td>
      <td align="center">
        <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white"></a>
        <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white"></a>
      </td>
    </tr>
    <tr>
      <td rowspan="3">Setup</td>
      <td>Code linting</td>
      <td align="center">
        <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/prettier-1A2C34?logo=prettier&logoColor=F7BA3E"></a>
        <a href="https://github.com/eslint/eslint"><img src="https://img.shields.io/badge/eslint-3A33D1?logo=eslint&logoColor=white"></a>
      </td>
    </tr>
    <tr>
      <!-- <td rowspan="2">Setup</td> -->
      <td>Commit linting</td>
      <td align="center">
      <a target="_blank" href="https://github.com/conventional-changelog/commitlint"><img src="https://img.shields.io/badge/commitlint-red?logo=commitlint&logoColor=white"></a>
      <a target="_blank" href="https://github.com/commitizen/cz-cli"><img src="https://img.shields.io/badge/commitizen-pink?logo=conventionalcommits&logoColor=white"></a>
      <a href="https://gitmoji.dev"><img
    src="https://img.shields.io/badge/gitmoji-%20😜%20😍-FFDD67.svg?style=flat-square"
    alt="Gitmoji"/></a>
      </td>
    </tr>
    <tr>
      <!-- <td rowspan="2">Setup</td> -->
      <td>Other</td>
      <td align="center">
        <a href="https://editorconfig.org/"><img src="https://img.shields.io/badge/Editor%20Config-E0EFEF?logo=editorconfig&logoColor=000"></a>
        <a target="_blank" href="https://github.com/typicode/husky"><img src="https://img.shields.io/badge/🐶%20husky-green?logo=husky&logoColor=white"></a>
        <a target="_blank" href="https://github.com/okonet/lint-staged"><img src="https://img.shields.io/badge/🚫%20lint%20staged-yellow?&logoColor=white"></a>
      </td>
    </tr>
  </table>
</div>

## :books: About<a href="#TOC"><img align="right" src="./.github/images/up_arrow.png" width="22"></a>

## Related

- [x] [esports-notifier](https://github.com/lucasvtiradentes/esports-notifier): Receive a daily email informing whenever at least one of your favorite esports teams has a match on the current date;
- [x] [gcal-sync](https://github.com/lucasvtiradentes/gcal-sync): sync your github commits and ticktick tasks to your google calendar and track your work effortlessly;
- [x] [GAS docs](https://developers.google.com/apps-script/reference/script/clock-trigger-builder?hl=pt-br): documentation related to triggering functions in Google Apps script.

## License

This project is distributed under the terms of the MIT License Version 2.0. A complete version of the license is available in the [LICENSE](LICENSE) file in this repository. Any contribution made to this project will be licensed under the MIT License Version 2.0.

## Feedback

If you have any questions or suggestions you are welcome to discuss it on [github issues](https://github.com/lucasvtiradentes/twitch-notifier/issues) or, if you prefer, you can reach me in my social media provided bellow.

<a href="#"><img src="./.github/images/divider.png" /></a>

<div align="center">
  <p>
    <a target="_blank" href="https://www.linkedin.com/in/lucasvtiradentes/"><img src="https://img.shields.io/badge/-linkedin-blue?logo=Linkedin&logoColor=white" alt="LinkedIn"></a>
    <a target="_blank" href="mailto:lucasvtiradentes@gmail.com"><img src="https://img.shields.io/badge/gmail-red?logo=gmail&logoColor=white" alt="Gmail"></a>
    <a target="_blank" href="https://discord.com/users/262326726892191744"><img src="https://img.shields.io/badge/discord-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
    <a target="_blank" href="https://github.com/lucasvtiradentes/"><img src="https://img.shields.io/badge/github-gray?logo=github&logoColor=white" alt="Github"></a>
  </p>
  <p>Made with ❤️ by <b>Lucas Vieira</b></p>
  <p>👉 See also all <a href="https://github.com/lucasvtiradentes/lucasvtiradentes/blob/master/portfolio/PROJECTS.md#TOC">my projects</a></p>
  <p>👉 See also all <a href="https://github.com/lucasvtiradentes/my-tutorials/blob/master/README.md#TOC">my articles</a></p>
</div>
