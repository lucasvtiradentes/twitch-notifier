import TwitchNotifier from '../src/TwitchNotifier';
import { configs } from '../resources/config';

it('should throw an error when initializing without configs', () => {
  expect(() => {
    const config = undefined as any;
    new TwitchNotifier(config);
  }).toThrow('You must specify the settings when starting the class');
});

it('should not throw an error when initializing with valid configs', () => {
  expect(new TwitchNotifier(configs)).toHaveProperty('APPNAME');
});
