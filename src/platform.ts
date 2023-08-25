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
    this.accessories.push(accessory);  // add to the accessories cache
  }

  async discoverDevices() {
    const { email, password } = this.config as any;

    this.tplink = await login(email, password);
    const devices = await this.tplink.getDeviceList();
    this.log.debug('Discovered %s devices', devices.length);

    for (const device of devices) {
      const deviceHandler = await this.initKasaDevice(device);

      if (!deviceHandler) {
        continue; // Skip devices without a recognized handler
      }

      // Check for child devices
      if (deviceHandler.getChildren) {
        const children = await deviceHandler.getChildren();
        for (const child of children) {
          const childObj = await deviceHandler.getChild(child.alias);
          this.handleDevice(childObj);  // Using same handler for child
        }
      } else {
        // If no children, process the primary device
        this.handleDevice(deviceHandler);
      }
    }
  }

  handleDevice(device: any) {
    const identifier = device.hasOwnProperty("child") ? device.child.id : device.id;
    const deviceId = this.api.hap.uuid.generate(identifier);

    const existingAccessory = this.accessories.find(accessory => accessory.UUID === deviceId);

    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      existingAccessory.context.device = device;
      new KasaSwitchAccessory(this, existingAccessory);
    } else {
      this.log.info('Adding new accessory:', device.alias);
      const accessory = new this.api.platformAccessory(device.alias, deviceId);
      accessory.context.device = device;
      new KasaSwitchAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  private initKasaDevice(device: any): any {
    switch (device.deviceModel) {
      case 'HS100(US)':
      case 'HS103(US)':
      case 'HS200(US)':
        return this.tplink.getHS100(device.alias);
      case 'KS230(US)':
      case 'HS220(US)':
        return this.tplink.getHS220(device.alias);
      case 'EP40(US)':
        return this.tplink.getHS300(device.alias);
      default:
        console.log("Skipping device " + device.deviceModel);
        return null;
    }
  }
}
