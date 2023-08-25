import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { TPLinkCloudPlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class KasaSwitchAccessory {
  private service: Service;

  constructor(
    private readonly platform: TPLinkCloudPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the Switch service if it exists, otherwise create a new Switch service
    // you can create multiple services for each accessory
    this.service = (this.accessory.context.device.getBrightness)
      ? this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb)
      : this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.alias);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setRelayOn.bind(this))
      .onGet(this.getRelayOn.bind(this));

    if (this.accessory.context.device.getBrightness) {
      this.service.getCharacteristic(this.platform.Characteristic.Brightness)
        .onSet(this.setBrightness.bind(this))
        .onGet(this.getBrightness.bind(this));
    }
  }

  async setRelayOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.accessory.context.device.setRelayState(value);
  }

  async getRelayOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = await this.accessory.context.device.getRelayState();
    return isOn;
  }

  async getBrightness(): Promise<CharacteristicValue> {
    const brightness = this.accessory.context.device.getBrightness();

    return brightness;
  }

  async setBrightness(value: CharacteristicValue) {
    this.accessory.context.device.setBrightness(value);
  }
}
