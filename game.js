const res = {
  width: 208,
  height: 176,
};

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }
  preload() {
    this.load.image("tiles", "assets/tileset.png");
    this.load.spritesheet("tilesheet", "assets/tileset.png", {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 0,
    });
    this.load.tilemapTiledJSON("map01", "assets/map01.json");
  }
  create() {
    const map01 = this.make.tilemap({
      key: "map01",
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 0,
    });
    const tileset = map01.addTilesetImage("tileset", "tiles");
    const bg = map01.createLayer("BG", tileset, 0, 0);
    const walls = map01.createLayer("Walls", tileset, 0, 0);
    walls.setCollisionByExclusion([-1]);

    // setting up player
    this.startPosition = { x: 48, y: 48 };
    this.currentCheckpoint = null;
    this.playerLives = 3;
    this.playerScore = 0;

    this.player = this.physics.add.sprite(
      this.startPosition.x,
      this.startPosition.y,
      "tilesheet",
      0
    );
    this.player.setOrigin(0, 1);
    this.player.setDepth(100);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.physics.add.collider(this.player, walls);

    // player's camera
    this.cameras.main.setBounds(
      0,
      0,
      map01.widthInPixels,
      map01.heightInPixels
    );
    this.cameras.main.startFollow(this.player);

    // needlers enemy
    this.needlers = this.physics.add.staticGroup(); // group of all the needlers objects

    const needlersLayer = map01.getObjectLayer("Needlers");
    needlersLayer.objects.forEach((obj) => {
      const needler = this.needlers.create(obj.x, obj.y, "tilesheet", 7);
      needler.setOrigin(0, 1);
      needler.body.setOffset(8, -8); // 8,-8 for 16 bit sprites only
    });

    this.physics.add.overlap(
      this.player,
      this.needlers,
      this.handlePlayerHit,
      null,
      this
    );

    // Lifeups
    this.lifeups = this.physics.add.staticGroup();
    const lifeupsLayer = map01.getObjectLayer("LifeUps");
    lifeupsLayer.objects.forEach((obj) => {
      const lifeup = this.lifeups.create(obj.x, obj.y, "tilesheet", 5);
      lifeup.setOrigin(0, 1);
      lifeup.body.setOffset(8, -8); // 8,-8 for 16 bit sprites only
    });

    this.physics.add.overlap(
      this.player,
      this.lifeups,
      this.handleLifeUp,
      null,
      this
    );

    // Checkpoints
    this.checkpoints = this.physics.add.staticGroup();
    const checkpointsLayer = map01.getObjectLayer("Checkpoints");
    checkpointsLayer.objects.forEach((obj) => {
      const checkpoint = this.checkpoints.create(obj.x, obj.y, "tilesheet", 3);
      checkpoint.setOrigin(0, 1);
      checkpoint.body.setOffset(8, -8);
    });

    this.physics.add.overlap(
      this.player,
      this.checkpoints,
      this.handleCheckpoints,
      null,
      this
    );

    // Rings
    this.rings = this.physics.add.staticGroup();
    this.ringsRemaining = 0;
    const ringsLayer = map01.getObjectLayer("Rings");
    ringsLayer.objects.forEach((obj) => {
      const ring = this.rings.create(obj.x, obj.y, "tilesheet", 1);
      ring.setOrigin(0.2, 1.1);
      ring.setScale(1.8);
      ring.body.setSize(ring.width * 1, ring.height * 1.8);
      ring.body.setOffset(8, -23);
      if (obj.rotation == 90) {
        ring.setAngle(90);
        const displayWidth = ring.body.width;
        const displayHeight = ring.body.height;
        ring.body.setSize(displayHeight, displayWidth, false);
        ring.body.setOffset(10, 8);
      }
      this.ringsRemaining++;
    });

    this.physics.add.overlap(
      this.player,
      this.rings,
      this.handleRings,
      null,
      this
    );

    // Gate
    this.gate = this.physics.add.staticGroup();
    const gateLayer = map01.getObjectLayer("Gate");
    gateLayer.objects.forEach((obj) => {
      const gateBlock = this.gate.create(obj.x, obj.y, "tilesheet", 8);
      gateBlock.setOrigin(0, 1);
      gateBlock.body.setOffset(8, -8);
    });
    this.gateCollider = this.physics.add.collider(this.player, this.gate);
    this.physics.add.overlap(
      this.player,
      this.gate,
      this.handleGate,
      null,
      this
    );

    // UI : Lives

    this.lifeIcons = [];
    for (let i = 0; i < this.playerLives; i++) {
      const xPos = 10 + i * 16;
      const lifeIcon = this.add.sprite(xPos, 140, "tilesheet", 0);
      lifeIcon.setScale(0.9);
      lifeIcon.setScrollFactor(0);
      this.lifeIcons.push(lifeIcon);
    }

    // UI : Rings
    this.ringIcons = [];
    for (let i = 0; i < this.ringsRemaining; i++) {
      const xPos = 10 + i * 10;
      const ringIcon = this.add.sprite(xPos, 160, "tilesheet", 1);
      ringIcon.setScale(0.9);
      ringIcon.setScrollFactor(0);
      this.ringIcons.push(ringIcon);
    }

    // UI : Score
    this.scoreText = this.add.text(140, 140, this.playerScore.toString(), {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffffff",
    });
    this.scoreText.setScrollFactor(0);
  }
  update() {
    this.player.setVelocityX(0);
    // this.player.setVelocityY(0);
    if (this.cursors.up.isDown == true && this.player.body.onFloor()) {
      this.player.setVelocityY(-120);
    }
    if (this.cursors.right.isDown == true) {
      this.player.setVelocityX(100);
    }
    if (this.cursors.left.isDown == true) {
      this.player.setVelocityX(-100);
    }
  }

  handlePlayerHit(player, needler) {
    this.playerLives--;

    if (this.lifeIcons && this.lifeIcons.length > 0) {
      const icon = this.lifeIcons.pop();
      icon.destroy();
    }

    if (this.playerLives <= 0) {
      this.scene.start("GameOverScene");
    } else {
      if (this.currentCheckpoint) {
        player.setPosition(this.currentCheckpoint.x, this.currentCheckpoint.y);
      } else {
        player.setPosition(this.startPosition.x, this.startPosition.y);
      }
    }
  }

  handleLifeUp(player, lifeup) {
    this.playerLives++;
    lifeup.destroy();
    const xPos = 10 + this.lifeIcons.length * 16;
    let newLifeIcon = this.add.sprite(xPos, 140, "tilesheet", 0);
    newLifeIcon.setScale(0.9);
    newLifeIcon.setScrollFactor(0);
    this.lifeIcons.push(newLifeIcon);
    this.playerScore += 100;
    this.scoreText.setText(this.playerScore.toString());
  }

  handleCheckpoints(player, checkpoint) {
    if (checkpoint.frame.name != 4 && checkpoint.frame.name !== "4") {
      this.playerScore += 20;
      this.scoreText.setText(this.playerScore.toString());
    }
    this.currentCheckpoint = { x: checkpoint.x, y: checkpoint.y };
    checkpoint.setFrame(4);
  }

  handleRings(player, ring) {
    if (ring.frame.name != 2 && ring.frame.name !== "2") {
      ring.setFrame(2);
      this.ringsRemaining--;
      this.playerScore += 50;
      this.scoreText.setText(this.playerScore.toString());
      if (this.ringIcons && this.ringIcons.length > 0) {
        const icon = this.ringIcons.pop();
        icon.destroy();
      }
      if (this.ringsRemaining <= 0) {
        this.openGate();
      }
    }
  }

  openGate() {
    this.gate.getChildren().forEach((gate) => {
      gate.setFrame(9);
      this.physics.world.removeCollider(this.gateCollider);
    });
  }

  handleGate(player, gateBlock) {
    if (gateBlock.frame.name == "9") {
      this.time.delayedCall(100, () => {
        this.scene.start("LevelCompleteScene");
      });
    }
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }
  create() {
    const centerX = res.width / 6;
    const centerY = res.height / 4;
    this.add.text(centerX, centerY, "Game Over\n Press SPACE to Restart", {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffffff",
      align: "center",
    });
    this.input.keyboard.once("keydown-SPACE", () =>
      this.scene.start("GameScene")
    );
  }
}

class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super("LevelCompleteScene");
  }
  create() {
    const centerX = res.width / 6;
    const centerY = res.height / 4;
    this.add.text(
      centerX,
      centerY,
      "To Be Continued... \n Press SPACE to Play Again",
      {
        fontFamily: "Arial",
        fontSize: "12px",
        color: "#ffffff",
        align: "center",
      }
    );
    this.input.keyboard.once("keydown-SPACE", () =>
      this.scene.start("GameScene")
    );
  }
}

const config = {
  type: Phaser.WEBGL,
  width: res.width,
  height: res.height,
  canvas: gameCanvas,
  scene: [GameScene, GameOverScene, LevelCompleteScene],
  pixelArt: true,
  backgroundColor: "#0153ff",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 100 },
      debug: false,
    },
  },
};

const game = new Phaser.Game(config);
