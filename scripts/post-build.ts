import { DynMarkdown } from 'dyn-markdown';
import minify from 'minify';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

(async () => {
  const FILES = {
    package: './package.json',
    readme: './README.md',
    gasAppsScript: './dist/GAS-appsscript.json',
    gasSetup: './dist/GAS-setup.js',
    twitchNotifierUdm: `./dist/UMD-TwitchNotifier.js`,
    twitchNotifier: `./dist/TwitchNotifier.js`,
    twitchNotifierMin: `./dist/TwitchNotifier.min.js`
  };

  const README_FILES = {
    gasAppsScriptContent: 'GAS_APPSSCRIPT',
    gasSetupContent: 'GAS_SETUP'
  };

  const VERSION = JSON.parse(readFileSync(FILES.package, { encoding: 'utf8' })).version;

  const setupGasFileContent = getGasSetupFileContent(VERSION);
  const allowGasPermissionFileContent = getAppsScriptAllowPermissionFileContent();

  writeFileSync(FILES.gasSetup, setupGasFileContent);
  writeFileSync(FILES.gasAppsScript, allowGasPermissionFileContent);

  const readmeFile = new DynMarkdown(FILES.readme);
  readmeFile.updateField(README_FILES.gasSetupContent, `\n<pre>${setupGasFileContent}</pre>\n`);
  readmeFile.updateField(README_FILES.gasAppsScriptContent, `\n<pre>${allowGasPermissionFileContent}</pre>\n`);
  readmeFile.saveFile();

  const VERSION_UPDATE = `// version`;
  replaceFileContent(FILES.twitchNotifierUdm, VERSION_UPDATE, `this.VERSION = '${VERSION}'; ${VERSION_UPDATE}`);
  replaceFileContent(FILES.readme, VERSION_UPDATE, `// const version = "${VERSION}" ${VERSION_UPDATE}`);

  await minifyFile(FILES.twitchNotifierUdm, FILES.twitchNotifierMin);

  unlinkSync(FILES.twitchNotifier);
  unlinkSync(FILES.twitchNotifierUdm);
})();

/* ========================================================================== */

function replaceFileContent(file: string, strToFind: string, strToReplace: string) {
  const originalContent = readFileSync(file, { encoding: 'utf8' });
  // prettier-ignore
  const newContent = originalContent.split('\n').map((line) => {
    const hasSearchedStr = line.search(strToFind) > 0
    const identation = line.length - line.trimStart().length
    return hasSearchedStr ? `${' '.repeat(identation)}${strToReplace}` : line
  }).join('\n');
  writeFileSync(file, newContent);
}

async function minifyFile(filePath: string, outFile: string) {
  const minifiedContent = await minify(filePath);
  writeFileSync(outFile, minifiedContent);
}

function getAppsScriptAllowPermissionFileContent() {
  const appsScript = `{
  "timeZone": "Etc/GMT",
  "dependencies": {},
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}`;

  return appsScript;
}

function getGasSetupFileContent(version: string) {
  let configContent = readFileSync('./resources/config.ts', { encoding: 'utf-8' });
  configContent = configContent.replace('// prettier-ignore\n', '');
  configContent = configContent.replace("import TwitchNotifier from '../src/TwitchNotifier';\n", '');
  configContent = configContent.replace("type Configs = TwitchNotifier['config'];\n\n", '');
  configContent = configContent.replace('export const configs: Configs = ', '');

  const gasSetupContent = `const CONFIGS = ${configContent}
function getTwitchNotifier(){
  const version = "${version}"
  const content = UrlFetchApp.fetch(\`https://cdn.jsdelivr.net/npm/twitch-notifier@\${version}\`).getContentText();
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
}`;

  return gasSetupContent;
}
