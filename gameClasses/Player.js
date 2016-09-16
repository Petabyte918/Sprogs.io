var Player = IgeEntityBox2d.extend({
	classId: 'Player',

	init: function (username) {
		IgeEntityBox2d.prototype.init.call(this);
		this.category("Player");

		this.drawBounds(false);

		this._thrustVelocity = 0;
		this._mouseAngleFromPlayer = 0;

		this.playerProperties = {
			username: "Player",
			health: 100,
			score: 0,
			isDead: false,
			timeToHit: 0,
			fireRate: 500
		};

		// Used to tell the server when we give input
		this.controls = {
			left: false,
			right: false,
			thrust: false,
			fire: false
		};

		var spriteScale = 2;	// the texture and collider scale

		if (ige.isServer) {
			if(ige.box2d) {
				var fixDefs = this.setUpCollider(spriteScale);
				fixDefs.push({
					density: 0.5,
					friction: 0,
					restitution: 0.2
				});

				this.box2dBody({
					type: 'dynamic',
					linearDamping: 0,
					angularDamping: 7.5,
					allowSleep: true,
					fixedRotation: false,
					fixtures: fixDefs
				});

				this.serverProperties = {
					thrustVelocity: 0,          // current velocity
					maxThrustVelocity: 7,     	// max velocity
					rotationDivisor: 3.3,		// divisor to calculate rotation velocity
					acceleration: 0.025,        // percent of maxThrust to increase by every tick
					friction: 0.04              // percent of thrust to decrease by every tick
				};
			}

			this.addComponent(IgeVelocityComponent);
		}

		if (ige.isClient) {
			this.playerProperties.username = username;

			this.clientProperties = {
				prev_position: new IgePoint3d(0,0,0)
			};

			this.sounds = {
				hit: new Howl({
					src: ['./assets/sounds/hit.wav']
				}),
				hit2: new Howl({
					src: ['./assets/sounds/hit2.wav']
				}),
				hit3: new Howl({
					src: ['./assets/sounds/hit3.wav']
				}),
				hurt: new Howl({
					src: ['./assets/sounds/hurt.wav']
				}),
				death: new Howl({
					src: ['./assets/sounds/death.wav']
				})
			};

			this.switches = {
				thrustEmitterStarted: false,
				explosionEmitterStarted: false,
				screenShake: false
			};

			this.screenShake = {
				min: 0,
				max: 0
			};

			this.texture(ige.client.textures.ship)
			.width(32 * spriteScale)
			.height(32 * spriteScale);

			this.createEmitters();
		}

		// Define the data sections that will be included in the stream
		this.streamSections(['transform', 'health', 'score']);
	},

	/**
	 * Override the default IgeEntity class streamSectionData() method
	 * so that we can check for the custom1 section and handle how we deal
	 * with it.
	 * @param {String} sectionId A string identifying the section to
	 * handle data get / set for.
	 * @param {*=} data If present, this is the data that has been sent
	 * from the server to the client for this entity.
	 * @return {*}
	 */
	streamSectionData: function (sectionId, data) {
		if(sectionId == 'health'){
			if(!data){
				if(ige.isServer){
					return this.playerProperties.health;
				} else {
					return;
				}
			} else {
				if (this.playerProperties.health != data) {
					this.playerProperties.health = data;

					if(ige.isClient && data < 100) {
						this.sounds.hurt.play();
					}
				}

			}
		}

		if(sectionId == 'score'){
			if(!data){
				if(ige.isServer){
					return this.playerProperties.score;
				} else {
					return;
				}
			} else {
				if (this.playerProperties.score != data) {
					this.playerProperties.score = data;
				}
			}
		}

		// The section was not one that we handle here, so pass this
		// to the super-class streamSectionData() method - it handles
		// the "transform" section by itself
		return IgeEntity.prototype.streamSectionData.call(this, sectionId, data);
	},

	// Called when a player is first created on a client through the stream.
	streamCreateData: function() {
		return this.playerProperties.username;
	},

	/**
	 * Called every frame by the engine when this entity is mounted to the
	 * scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		/* CEXCLUDE */
		if (ige.isServer) {
			this.handleControls();
		}
		/* CEXCLUDE */

		if (ige.isClient) {
			this.checkForDeath();

			if (this.isMyPlayer()) {
				this.captureInput();
			}

			this.handleGraphics();
			this.handleEmitters();
		}

		// Call the IgeEntity (super-class) tick() method
		IgeEntityBox2d.prototype.tick.call(this, ctx);
	},

	handleControls: function () {
		if (this.playerProperties.isDead) {
			for (var control in this.controls) {
				this.controls[control] = false;
			}
		}

		// Declare friction here so we can disable it when accelerating
		var fric = this.serverProperties.friction;

		// Calculate rotateVelocity based on current thrustVelocity
		var rotateVelocity = this.serverProperties.thrustVelocity / this.serverProperties.rotationDivisor;

		// Whenever we listen for input, awake the body
		if (this.controls.left) {
			this._box2dBody.SetAngularVelocity(-rotateVelocity);
			this._box2dBody.SetAwake(true);
		} if (this.controls.right) {
			this._box2dBody.SetAngularVelocity(rotateVelocity);
			this._box2dBody.SetAwake(true);
		}

		// Apply acceleration and disable friction
		if (this.controls.thrust) {
			if (this.serverProperties.thrustVelocity < this.serverProperties.maxThrustVelocity) {
				this.serverProperties.thrustVelocity += this.serverProperties.maxThrustVelocity * this.serverProperties.acceleration;
				fric = 0;
			}

			this._box2dBody.SetAwake(true);
		}

		// Calculate the angle in which the ship is pointing
		var angle = this._rotate.z + Math.radians(-90);
		var xComponent = Math.cos(angle);
		var yComponent = Math.sin(angle);

		// Always apply velocity in the direction of the ship
		this._box2dBody.SetLinearVelocity(new IgePoint3d(this.serverProperties.thrustVelocity * xComponent, this.serverProperties.thrustVelocity * yComponent, 0));

		// Apply friction to the current thrustVelocity
		this.serverProperties.thrustVelocity > 0.05
			? this.serverProperties.thrustVelocity *= 1 - fric
			: this.serverProperties.thrustVelocity = 0;

		// Set _thrustVelocity which is streamed to the client
		if (this.serverProperties != 0) this._thrustVelocity = this.serverProperties.thrustVelocity;

		if (this.controls.fire && this.playerProperties.timeToHit < ige.currentTime()) {
			this.playerProperties.timeToHit = this.playerProperties.fireRate + ige.currentTime();
			this.controls.fire = false;

			var myPos = this.worldPosition();

			new Projectile()
				.mount(ige.server.scene1)
				.shoot(myPos, this._mouseAngleFromPlayer);
		}
	},

	captureInput: function () {
		if (this.playerProperties.isDead) return;

		if (ige.input.actionState('fire')) {
			if (!this.controls.fire) {
				if (this.playerProperties.timeToHit < ige.currentTime()) {
					this.playerProperties.timeToHit = this.playerProperties.fireRate + ige.currentTime();

					this.controls.fire = true;

					// Record our positions
					var mousePos = ige._currentViewport.mousePos();
					var myPos = this.worldPosition();

					// Find the angle to shoot at based of our mousePos and playerPos
					var dx = mousePos.x - myPos.x;
					var dy = mousePos.y - myPos.y;
					var rot = Math.atan2(dy, dx);
					var myRot = this._rotate.z;

					// Calculate the angles directly in front and in back of our ship
					var diffRot = (Math.abs(rot - myRot) * 180 / Math.PI ) % 360;

					// Set a range of degrees and prohibit shooting within those bounds
					// TODO: always fire a bullet, but reassign to the nearest in bounds
					var bounds = 40;
					if (!((diffRot > 90 - bounds && diffRot < 90 + bounds) ||
						(diffRot > 270 - bounds && diffRot < 270 + bounds))) {
						ige.network.send('playerControlFireDown', rot);
						this.setScreenShake();

						// Play a random shot sound
						Math.random() < 0.5 ? this.sounds.hit.play() : this.sounds.hit3.play();
					}
				}
			}
		} else {
			if (this.controls.fire) {
				this.controls.fire = false;
				ige.network.send('playerControlFireUp');
			}
		}

		if (ige.input.actionState('left')) {
			if (!this.controls.left) {
				this.controls.left = true;
				ige.network.send('playerControlLeftDown');
			}
		} else {
			if (this.controls.left) {
				this.controls.left = false;
				ige.network.send('playerControlLeftUp');
			}
		}

		if (ige.input.actionState('right')) {
			if (!this.controls.right) {
				this.controls.right = true;
				ige.network.send('playerControlRightDown');
			}
		} else {
			if (this.controls.right) {
				this.controls.right = false;
				ige.network.send('playerControlRightUp');
			}
		}

		if (ige.input.actionState('thrust')) {
			if (!this.controls.thrust) {
				this.controls.thrust = true;
				ige.network.send('playerControlThrustDown');
			}
		} else {
			if (this.controls.thrust) {
				this.controls.thrust = false;
				ige.network.send('playerControlThrustUp');
			}
		}
	},

	setUpCollider: function (scale) {
		// Points created in Physics Body Editor, set to the origin, rounded and copied over
		var y_offset = 0.105;
		var collisionPoly = new IgePoly2d()
			.addPoint(0, 0.45 - y_offset)
			.addPoint(-0.05, 0.4 - y_offset)
			.addPoint(-0.2, .075 - y_offset)
			.addPoint(-0.2, -0.1 - y_offset)
			.addPoint(-0.15, -0.325 - y_offset)
			.addPoint(-0.075, -0.4 - y_offset)
			.addPoint(0.075, -0.4 - y_offset)
			.addPoint(0.15, -0.325 - y_offset)
			.addPoint(0.2, -0.1 - y_offset)
			.addPoint(0.2, 0.075 - y_offset)
			.addPoint(0.05, 0.4 - y_offset);

		// Scale it up to fit texture
		collisionPoly.multiply(-scale);

		// Now convert this polygon into an array of triangles
		var triangles = collisionPoly.triangulate();

		// for every triangle in triangles, create a new fixture and append it to fixDefs
		var fixDefs = [];
		for (var i = 0; i < triangles.length; i++) {
			fixDefs.push({
				filter: {
					categoryBits: 0x0002,
					maskBits: 0xFFFF
				},
				shape: {
					type: 'polygon',
					data: triangles[i]
				}
			});
		}

		return fixDefs;
	},

	hurt: function (damage) {
		if (ige.isServer) {
			this.playerProperties.health -= damage;

			if (this.playerProperties.health <= 0 && !this.playerProperties.isDead) {
				this.respawn();
			}
		}
	},

	respawn: function () {
		this.playerProperties.isDead = true;

		// Get a new random spawnpoint
		var spawnpoint = ige.server.getPlayerSpawnPoint();

		var self = this;
		new IgeTimeout(function () {
			self.translateTo(spawnpoint.x, spawnpoint.y, spawnpoint.z);
			self.rotateTo(0,0,0);
			self.playerProperties.health = 100;
			self.playerProperties.isDead = false;
		}, 2500);
	},

	checkForDeath: function () {
		this.playerProperties.health <= 0 ?
			this.playerProperties.isDead = true:
			this.playerProperties.isDead = false;

	},

	isMyPlayer: function () {
		return ige.client._myPlayerId == this.id();
	},

	handleEmitters: function () {
		// Display trails based on movement speed. Maybe make it when controls.thrust?
		var clientVel = this.getPlayerVelocity();
		if (clientVel > 1.5 && !this.switches.thrustEmitterStarted) {
			this.thrustEmitter.start();
			this.switches.thrustEmitterStarted = true;
		} else if (clientVel < 0.75 && this.switches.thrustEmitterStarted){
			this.thrustEmitter.stop();
			this.switches.thrustEmitterStarted = false;
		}

		// Death explosion
		if (this.playerProperties.isDead && !this.switches.explosionEmitter) {
			this.explosionEmitter.start();
			if (this.isMyPlayer()) this.sounds.death.play();
			this.setScreenShake(-1,1,2500);
			this.switches.explosionEmitter = true;
		} else if (!this.playerProperties.isDead && this.switches.explosionEmitter){
			this.explosionEmitter.stop();
			this.switches.explosionEmitter = false;
		}
	},

	createEmitters: function () {
		// Add a particle emitter for the thrust particles
		// TODO: Add different quantities and velocities based on player velocity
		this.thrustEmitter = new IgeParticleEmitter()
		// Set the particle entity to generate for each particle
			.particle(ThrustParticle)
			// Set particle life to 300ms
			.lifeBase(300)
			// Set output to 60 particles a second (1000ms)
			.quantityBase(20)
			.quantityTimespan(1000)
			// Set the particle's death opacity to zero so it fades out as it's lifespan runs out
			.deathOpacityBase(0)
			// Set velocity vector to y = 0.05, with variance values
			.velocityVector(new IgePoint3d(0, 0.05, 0), new IgePoint3d(-0.16, 0.03, 0), new IgePoint3d(0.16, 0.15, 0))
			// Mount new particles to the object scene
			.particleMountTarget(ige.client.mainScene)
			// Move the particle emitter to the bottom of the ship
			.translateTo(0, 0, 0)
			// Mount the emitter to the ship
			.mount(this);

		this.explosionEmitter = new IgeParticleEmitter()
			.particle(ExplosionParticle)
			.lifeBase(120)
			.quantityBase(50)
			.deathOpacityBase(0)
			.velocityVector(new IgePoint3d(0, 0, 0), new IgePoint3d(-0.3, 0.2, 0), new IgePoint3d(0.3, -0.1, 0))
			.particleMountTarget(ige.client.mainScene)
			.translateTo(0, 0, 0)
			.mount(this);
	},

	handleGraphics: function () {
		// Attach the user's name label
		if (!this.nameTag) {
			this.nameTag = new IgeUiLabel()
				.width(100, false)
				.value(this.playerProperties.username)
				.mount(ige.client.scene1);

			var myPlayer = this;

			// Overwrite the tick function to track my player
			this.nameTag.tick = function (ctx) {
				var myPlayerPos = myPlayer.worldPosition();

				if (myPlayer._alive) {
					var x_offset = 0;
					var y_offset = -40;

					if (this.value.length == 7) x_offset = 25;
					else if (this.value.length == 6) x_offset = 28;
					else if (this.value.length == 5) x_offset = 30;
					else if (this.value.length == 4) x_offset = 32;
					else if (this.value.length == 3) x_offset = 35;
					else if (this.value.length == 2) x_offset = 40;
					else if (this.value.length == 1) x_offset = 40;

					this.translateTo(myPlayerPos.x + x_offset, myPlayerPos.y + y_offset, 0);

					// Call the IgeUiLabel (super-class) tick() method
					IgeUiLabel.prototype.tick.call(this, ctx);
				} else {
					this.destroy()
				}
			}
		} else if (this.nameTag) {
			if (this.nameTag.value != this.playerProperties.username) {
				this.nameTag.value = this.playerProperties.username;
			}
		}

		// Shake the screen
		if (this.switches.screenShake) {
			var min = this.screenShake.min;
			var max = this.screenShake.max;
			var x = Math.floor(Math.random()*(max-min+1)+min);
			var y = Math.floor(Math.random()*(max-min+1)+min);

			x += this.worldPosition().x;
			y += this.worldPosition().y;

			ige.client.vp1.camera.translateTo(x, y, 0);
		}
	},

	setPlayerUsername: function (pun) {
		this.playerProperties.username = pun;
		return this;
	},

	setScreenShake: function (min, max, duration) {
		if (this.isMyPlayer()) {
			if (min == undefined) min = -4;
			if (max == undefined) max = 4;
			if (duration == undefined)duration = 125;

			// Set the globals to be used in handleGraphics()
			this.screenShake.min = min;
			this.screenShake.max = max;
			this.switches.screenShake = true;

			// Stop tracking our player
			ige.client.vp1.camera.unTrackTranslate();

			var self = this;
			// In *duration* milliseconds: stop the screen screenShake,
			// track our player and cancel the interval
			new IgeInterval(function () {
				self.switches.screenShake = false;
				ige.client.vp1.camera.trackTranslate(self, 0);
				
				this.cancel();
			}, duration);
		}
	},

	// Returns the player's velocity in units/tick
	getPlayerVelocity: function () {
		var deltaX = this.worldPosition().x - this.clientProperties.prev_position.x;
		var deltaY = this.worldPosition().y - this.clientProperties.prev_position.y;
		var vel = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));

		this.clientProperties.prev_position = this.worldPosition();
		return vel;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Player; }