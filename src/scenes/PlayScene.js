import Phaser from 'phaser';

export default class PlayScene extends Phaser.Scene {
  constructor() {
    super('play');
    this.speed = 420;
    this.slotSymbol = '⚡';
  }

  create() {
    const { height, width } = this.scale;

    this.add
      .text(width / 2, 24, 'J/LY Runner', {
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

    this.score = 0;
    this.scoreText = this.add
      .text(24, 24, 'Score: 0', {
        fontSize: '20px',
        color: '#f8fafc'
      })
      .setOrigin(0, 0);

    this.shields = 3;
    this.shieldText = this.add
      .text(24, 52, 'Shields: ♥♥♥', {
        fontSize: '18px',
        color: '#fca5a5'
      })
      .setOrigin(0, 0);

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

    this.input.keyboard.on('keydown-J', () => this.fireChoice('j'));
    this.input.keyboard.on('keydown-L', () => this.fireChoice('ly'));
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.lastChoice) {
        this.fireChoice(this.lastChoice);
      }
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
    this.lastChoice = null;
    this.targetedObstacle = null;
    this.wordBank = [
      { word: 'enjoy', choice: 'j' },
      { word: 'jolly', choice: 'j' },
      { word: 'jinx', choice: 'j' },
      { word: 'jam', choice: 'j' },
      { word: 'slowly', choice: 'ly' },
      { word: 'brightly', choice: 'ly' },
      { word: 'calmly', choice: 'ly' },
      { word: 'lovely', choice: 'ly' }
    ];
  }

  update(_time, delta) {
    if (this.isGameOver) {
      return;
    }

    this.ground.tilePositionX += (this.speed * delta) / 1000;

    this.distance += (this.speed * delta) / 1000;
    this.distanceText.setText(`${Math.floor(this.distance)} m`);

    this.updateTargetLock();

    this.obstacles.getChildren().forEach((obstacle) => {
      if (obstacle.label) {
        obstacle.label.setPosition(obstacle.x, obstacle.y - 42);
      }
      if (obstacle.x < -obstacle.width) {
        if (obstacle.label) {
          obstacle.label.destroy();
        }
        obstacle.destroy();
      }
    });

    this.clouds.getChildren().forEach((cloud) => {
      if (cloud.x < -cloud.width) {
        cloud.destroy();
      }
    });
  }

  spawnObstacle() {
    if (this.isGameOver) {
      return;
    }

    const y = this.scale.height - 72;
    const wordData = Phaser.Utils.Array.GetRandom(this.wordBank);
    const maskedWord = this.getMaskedWord(wordData.word, wordData.choice);
    const obstacle = this.obstacles.create(this.scale.width + 40, y, 'obstacle');
    obstacle.setVelocityX(-this.speed);
    obstacle.wordData = wordData;
    obstacle.label = this.add
      .text(obstacle.x, obstacle.y - 42, maskedWord, {
        fontSize: '20px',
        color: '#f8fafc',
        backgroundColor: '#0f172a',
        padding: { x: 6, y: 2 }
      })
      .setOrigin(0.5);
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

  getMaskedWord(word, choice) {
    return word.replace(choice, this.slotSymbol);
  }

  updateTargetLock() {
    const obstacles = this.obstacles.getChildren().filter((obstacle) => obstacle.active);
    if (obstacles.length === 0) {
      this.clearTarget();
      return;
    }

    let closest = obstacles[0];
    obstacles.forEach((obstacle) => {
      if (obstacle.x < closest.x) {
        closest = obstacle;
      }
    });

    if (this.targetedObstacle !== closest) {
      this.clearTarget();
      this.targetedObstacle = closest;
      this.targetedObstacle.setTint(0x38bdf8);
      if (this.targetedObstacle.label) {
        this.targetedObstacle.label.setColor('#bae6fd');
      }
    }
  }

  clearTarget() {
    if (this.targetedObstacle && this.targetedObstacle.active) {
      this.targetedObstacle.clearTint();
      if (this.targetedObstacle.label) {
        this.targetedObstacle.label.setColor('#f8fafc');
      }
    }
    this.targetedObstacle = null;
  }

  fireChoice(choice) {
    if (this.isGameOver) {
      return;
    }

    const target = this.targetedObstacle || this.getNearestObstacle();
    if (!target) {
      return;
    }

    this.lastChoice = choice;

    const shotLabel = this.add
      .text(this.player.x + 20, this.player.y - 20, choice.toUpperCase(), {
        fontSize: '18px',
        color: '#f8fafc',
        backgroundColor: '#1d4ed8',
        padding: { x: 4, y: 2 }
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: shotLabel,
      x: target.x,
      y: target.y - 40,
      duration: 220,
      onComplete: () => {
        shotLabel.destroy();
        this.resolveShot(target, choice);
      }
    });
  }

  getNearestObstacle() {
    const obstacles = this.obstacles.getChildren().filter((obstacle) => obstacle.active);
    if (obstacles.length === 0) {
      return null;
    }

    return obstacles.reduce((closest, obstacle) => (obstacle.x < closest.x ? obstacle : closest));
  }

  resolveShot(target, choice) {
    if (!target.active || !target.wordData) {
      return;
    }

    if (choice === target.wordData.choice) {
      this.score += 10;
      this.scoreText.setText(`Score: ${this.score}`);
      this.playSuccessEffect(target);
      if (target.label) {
        target.label.setText(target.wordData.word);
        target.label.setColor('#86efac');
      }
      this.time.delayedCall(600, () => {
        if (target.label) {
          target.label.destroy();
        }
        target.destroy();
        if (this.targetedObstacle === target) {
          this.targetedObstacle = null;
        }
      });
      return;
    }

    this.shields = Math.max(0, this.shields - 1);
    this.updateShields();
    this.showFeedback('Wrong choice');

    if (this.shields <= 0) {
      this.handleHit();
    }
  }

  updateShields() {
    const hearts = '♥'.repeat(this.shields);
    const empty = '♡'.repeat(3 - this.shields);
    this.shieldText.setText(`Shields: ${hearts}${empty}`);
  }

  showFeedback(message) {
    const feedback = this.add
      .text(this.scale.width / 2, 90, message, {
        fontSize: '20px',
        color: '#fda4af',
        backgroundColor: '#1f2937',
        padding: { x: 8, y: 4 }
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: feedback,
      alpha: 0,
      y: 70,
      duration: 600,
      onComplete: () => feedback.destroy()
    });
  }

  playSuccessEffect(target) {
    const burst = this.add.circle(target.x, target.y - 40, 18, 0x22d3ee, 0.9);
    this.tweens.add({
      targets: burst,
      scale: 2,
      alpha: 0,
      duration: 350,
      onComplete: () => burst.destroy()
    });
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
