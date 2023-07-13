import { API } from 'homebridge';
import { TPLinkCloudPlatform } from './platform';
import { PLATFORM_NAME } from './settings';

export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, TPLinkCloudPlatform);
};
