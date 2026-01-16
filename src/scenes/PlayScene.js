import Phaser from 'phaser';

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super('play');
    this.speed = 420;
  }

  create() {
    const { height, width } = this.scale;

    this.add
      .text(width / 2, 24, 'Infinite Runner', {
        fontSize: '24px',
        color: '#e2e8f0'
      })
      .setOrigin(0.5, 0);

    this.distanceText = this.add
      .text(width - 24, 24, '0 m', {
        fontSize: '20px',
        color: '#e2e8f0'
      })
      .setOrigin(1, 0);

    this.ground = this.add
      .tileSprite(0, height - 48, width, 48, 'ground')
      .setOrigin(0, 0);

    this.clouds = this.add.group({
      runChildUpdate: true
    });

    this.spawnCloud();

    this.groundCollider = this.physics.add.staticImage(width / 2, height - 24, 'ground');
    this.groundCollider.displayWidth = width;
    this.groundCollider.displayHeight = 48;
    this.groundCollider.refreshBody();

    this.player = this.physics.add.sprite(160, height - 120, 'runner');
    this.player.setCollideWorldBounds(true);

    this.obstacles = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    this.physics.add.collider(this.player, this.groundCollider);
    this.physics.add.collider(this.player, this.obstacles, this.handleHit, undefined, this);

    this.inputKeys = this.input.keyboard.addKeys({
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    this.input.on('pointerdown', () => {
      this.tryJump();
    });

    this.spawnTimer = this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: this.spawnObstacle,
      callbackScope: this
    });

    this.cloudTimer = this.time.addEvent({
      delay: 2400,
      loop: true,
      callback: this.spawnCloud,
      callbackScope: this
    });

    this.distance = 0;
    this.isGameOver = false;
  }

  update(_time, delta) {
    if (this.isGameOver) {
      return;
    }

    this.ground.tilePositionX += (this.speed * delta) / 1000;

    if (this.inputKeys.jump.isDown) {
      this.tryJump();
    }

    this.distance += (this.speed * delta) / 1000;
    this.distanceText.setText(`${Math.floor(this.distance)} m`);

    this.obstacles.getChildren().forEach((obstacle) => {
      if (obstacle.x < -obstacle.width) {
        obstacle.destroy();
      }
    });

    this.clouds.getChildren().forEach((cloud) => {
      if (cloud.x < -cloud.width) {
        cloud.destroy();
      }
    });
  }

  tryJump() {
    if (this.player.body.blocked.down) {
      this.player.setVelocityY(-640);
    }
  }

  spawnObstacle() {
    if (this.isGameOver) {
      return;
    }

    const y = this.scale.height - 72;
    const obstacle = this.obstacles.create(this.scale.width + 40, y, 'obstacle');
    obstacle.setVelocityX(-this.speed);
  }

  spawnCloud() {
    if (this.isGameOver) {
      return;
    }

    const y = Phaser.Math.Between(80, 200);
    const cloud = this.add.sprite(this.scale.width + 60, y, 'cloud');
    cloud.speed = Phaser.Math.Between(60, 120);
    this.clouds.add(cloud);

    cloud.update = (time, delta) => {
      cloud.x -= (cloud.speed * delta) / 1000;
    };
  }

  handleHit() {
    if (this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.physics.pause();
    this.player.setTint(0xf87171);

    const restartText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Game Over\nPress Space to Retry', {
        fontSize: '28px',
        color: '#f8fafc',
        align: 'center'
      })
      .setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () => {
      restartText.destroy();
      this.scene.restart();
    });
  }
}
