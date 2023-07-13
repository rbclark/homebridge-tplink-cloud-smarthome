import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { login } from 'tplink-cloud-api';
import { PLUGIN_NAME, PLATFORM_NAME } from './settings';
import { KasaSwitchAccessory } from './platformAccessory';

export class TPLinkCloudPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  private tplink?: any;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    this.log = log;
    this.config = config;
    this.api = api;

    log.debug('Finished initializing platform:', this.config.name);

    api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    const { email, password } = this.config as any;

    this.tplink = await login(email, password);

    const devices = await this.tplink.getDeviceList();
    this.log.debug('Discovered %s devices', devices.length);

    for (const device of devices) {
      // See if an accessory with the same UUID has already been registered and restored from cached devices.
      const deviceId = this.api.hap.uuid.generate(device.deviceId);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === deviceId);
      const deviceHandler = this.initKasaDevice(device);

      if (existingAccessory) {
        // The accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        existingAccessory.context.device = deviceHandler;

        new KasaSwitchAccessory(this, existingAccessory);
      } else if (deviceHandler) {
        // The accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.alias);

        // Create a new accessory
        const accessory = new this.api.platformAccessory(device.alias, deviceId);

        accessory.context.device = deviceHandler;

        new KasaSwitchAccessory(this, accessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  private initKasaDevice(device: any) {
    switch(device.deviceModel) {
      case 'HS100(US)':
      case 'HS200(US)':
        return this.tplink.getHS100(device.alias);
      default:
        return null;
    }
  }
}
