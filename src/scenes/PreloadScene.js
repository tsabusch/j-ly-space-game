import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x38bdf8, 1);
    graphics.fillRoundedRect(0, 0, 46, 64, 8);
    graphics.generateTexture('runner', 46, 64);
    graphics.clear();

    graphics.fillStyle(0x334155, 1);
    graphics.fillRect(0, 0, 64, 48);
    graphics.generateTexture('ground', 64, 48);
    graphics.clear();

    graphics.fillStyle(0xf59e0b, 1);
    graphics.fillRoundedRect(0, 0, 32, 48, 6);
    graphics.generateTexture('obstacle', 32, 48);
    graphics.clear();

    graphics.fillStyle(0x94a3b8, 1);
    graphics.fillRoundedRect(0, 0, 80, 32, 16);
    graphics.generateTexture('cloud', 80, 32);
    graphics.destroy();
  }

  create() {
    this.scene.start('play');
  }
}
