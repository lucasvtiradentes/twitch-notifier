import TwitchNotifier from './export-lib';
import { config } from './lib-config';

it('should throw an error when initializing without configs', () => {
  expect(() => {
    new TwitchNotifier();
  }).toThrow('You must specify the settings when starting the class');
});

it('should not throw an error when initializing with valid configs', () => {
  expect(new TwitchNotifier(config)).toHaveProperty('APPNAME');
});
