import { readFileSync } from 'fs';

const globalAny: any = global;

const twitchNotifierContent = readFileSync('./dist/TwitchNotifier.min.js', { encoding: 'utf-8' });
eval(`globalAny.TwitchNotifier = ${twitchNotifierContent}`);

export default globalAny.TwitchNotifier;
