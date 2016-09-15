var Player = IgeEntityBox2d.extend({
	classId: 'Player',

	init: function () {
		IgeEntityBox2d.prototype.init.call(this);
		this.category("Player");

		this.drawBounds(false);

		this._score = 0;
		this._health = 100;
		this._thrustVelocity = 0;
		this._mouseAngleFromPlayer = 0;
		this._playerUsername;

		// Used to tell the server when we give input
		this.controls = {
			left: false,
			right: false,
			thrust: false,
			fire: false
		};

		var spriteScale = 2;		// the texture and collider scale

		if (ige.isServer) {
			if(ige.box2d) {
				// ige.box2d.networkDebugMode(true); // adds additional console output for the debugger

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
					timeToHit: 0,
					fireRate: 500,
					isDead: false,
					health: 100,
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
			this.switches = {
				thrustEmitterStarted: false,
				explosionEmitterStarted: false
			};

			this.texture(ige.client.textures.ship)
			.width(32 * spriteScale)
			.height(32 * spriteScale);

			this.createEmitters();
		}

		// Define the data sections that will be included in the stream
		this.streamSections(['transform', 'score', 'thrustVelocity', 'health', 'playerUsername']);
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
		// Check if the section is one that we are handling
		if (sectionId === 'score') {
			// Check if the server sent us data, if not we are supposed
			// to return the data instead of set it
			// TODO: find a better way to stream data. Constantly sends and sets _score and _thrustVelocity whenever either changes
			if (data) {
				// We have been given new data!
				this._score = data;
				return;
			} else {
				// Return current data
				return this._score;
			}
		}

		if (sectionId === 'health') {
			// Check if the server sent us data, if not we are supposed
			// to return the data instead of set it
			if (data) {
				// We have been given new data!
				this._health = data;
				return;
			} else {
				// Return current data
				return this._health;
			}
		}

		if (sectionId === 'playerUsername') {
			// Check if the server sent us data, if not we are supposed
			// to return the data instead of set it
			if (data) {
				// We have been given new data!
				this._playerUsername = data;
				return;
			} else {
				// Return current data
				return this._playerUsername;
			}
		}

		if (sectionId === 'thrustVelocity') {
			// Check if the server sent us data, if not we are supposed
			// to return the data instead of set it
			if (data) {
				// We have been given new data!
				this._thrustVelocity = data;
				return;
			} else {
				// Return current data
				return this._thrustVelocity;
			}
		}
		// The section was not one that we handle here, so pass this
		// to the super-class streamSectionData() method - it handles
		// the "transform" section by itself
		return IgeEntity.prototype.streamSectionData.call(this, sectionId, data);
	},

	/**
	 * Called every frame by the engine when this entity is mounted to the
	 * scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		/* CEXCLUDE */
		if (ige.isServer) {
			this.checkForDeath();
			this.handleControls();
		}
		/* CEXCLUDE */

		if (ige.isClient) {
			if (this.isMyPlayer()) {
				this.handleInput();
			}

			this.handleGraphics();
			this.handleEmitters();
		}

		// Call the IgeEntity (super-class) tick() method
		IgeEntityBox2d.prototype.tick.call(this, ctx);
	},

	handleControls: function () {
		// Stop movement if we are dead
		if (this.serverProperties.isDead) {
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

		if (this.controls.fire && this.serverProperties.timeToHit < ige.currentTime()) {
			this.serverProperties.timeToHit = this.serverProperties.fireRate + ige.currentTime();
			this.controls.fire = false;

			var myPos = this.worldPosition();

			new Projectile()
				.mount(ige.server.scene1)
				.shoot(myPos, this._mouseAngleFromPlayer);
		}
	},

	handleInput: function () {
		if (ige.input.actionState('fire')) {
			if (!this.controls.fire) {
				// Record the new state
				this.controls.fire = true;

				var mousePos = ige._currentViewport.mousePos();
				var myPos = this.worldPosition();

				var dx = mousePos.x - myPos.x;
				var dy = mousePos.y - myPos.y;
				var rot = Math.atan2(dy, dx);
				var myRot = this._rotate.z;

				var diffRot = (Math.abs(rot-myRot) * 180/Math.PI )% 360;

				// TODO: always fire a bullet, but reassign to the nearest in bounds
				var bounds = 50;
				if (!((diffRot > 90 - bounds && diffRot < 90 + bounds) ||
					(diffRot > 270 - bounds && diffRot < 270 + bounds))) {
					ige.network.send('playerControlFireDown', rot);
				}

			}
		} else {
			if (this.controls.fire) {
				// Record the new state
				this.controls.fire = false;

				// Tell the server about our control change
				ige.network.send('playerControlFireUp');
			}
		}

		if (ige.input.actionState('left')) {
			if (!this.controls.left) {
				// Record the new state
				this.controls.left = true;

				// Tell the server about our control change
				ige.network.send('playerControlLeftDown');
			}
		} else {
			if (this.controls.left) {
				// Record the new state
				this.controls.left = false;

				// Tell the server about our control change
				ige.network.send('playerControlLeftUp');
			}
		}

		if (ige.input.actionState('right')) {
			if (!this.controls.right) {

				// Record the new state
				this.controls.right = true;

				// Tell the server about our control change
				ige.network.send('playerControlRightDown');
			}
		} else {
			if (this.controls.right) {
				// Record the new state
				this.controls.right = false;

				// Tell the server about our control change
				ige.network.send('playerControlRightUp');
			}
		}

		if (ige.input.actionState('thrust')) {
			if (!this.controls.thrust) {
				// Record the new state
				this.controls.thrust = true;

				// Tell the server about our control change
				ige.network.send('playerControlThrustDown');
			}
		} else {
			if (this.controls.thrust) {
				// Record the new state
				this.controls.thrust = false;

				// Tell the server about our control change
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
			this.serverProperties.health -= damage;

			if (this.serverProperties.health <= 0 && !this.serverProperties.isDead) {
				this.respawn();
			}
		}
	},

	respawn: function () {
		this.serverProperties.isDead = true;

		var spawnpoint = ige.server.getPlayerSpawnPoint();

		var self = this;
		new IgeTimeout(function () {
			self.translateTo(spawnpoint.x, spawnpoint.y, spawnpoint.z);
			self.rotateTo(0,0,0);
			self.serverProperties.health = 100;
			self.serverProperties.isDead = false;
		}, 2500);
	},

	checkForDeath: function () {
		if (this.serverProperties.isDead) {
			for (var control in this.controls) {
				this.controls[control] = false;
			}
		}

		// Keep the client updated about health
		if (this.serverProperties.health != this._health) {
			this._health = this.serverProperties.health;
		}
	},

	isMyPlayer: function () {
		return ige.client._myPlayerId == this.id();
	},

	handleEmitters: function () {
		if (this._thrustVelocity > 1 && !this.switches.thrustEmitterStarted) {
			this.thrustEmitter.start();
			this.switches.thrustEmitterStarted = true;
		} else if (this._thrustVelocity < 0.75 && this.switches.thrustEmitterStarted){
			this.thrustEmitter.stop();
			this.switches.thrustEmitterStarted = false;
		}

		if (this._health <= 0  && !this.switches.explosionEmitter) {
			this.explosionEmitter.start();
			this.switches.explosionEmitter = true;
		} else if (this._health > 0 && this.switches.explosionEmitter){
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

		// Add a particle emitter for the thrust particles
		// TODO: Add different quantities and velocities based on player velocity
		this.explosionEmitter = new IgeParticleEmitter()
		// Set the particle entity to generate for each particle
			.particle(ExplosionParticle)
			// Set particle life to 300ms
			.lifeBase(120)
			// Set output to 60 particles a second (1000ms)
			.quantityBase(50)
			// .quantityTimespan(500)
			// Set the particle's death opacity to zero so it fades out as it's lifespan runs out
			.deathOpacityBase(0)
			// Set velocity vector to y = 0.05, with variance values
			.velocityVector(new IgePoint3d(0, 0, 0), new IgePoint3d(-0.3, 0.2, 0), new IgePoint3d(0.3, -0.1, 0))
			// Mount new particles to the object scene
			.particleMountTarget(ige.client.mainScene)
			.translateTo(0, 0, 0)
			// Mount the emitter to the ship
			.mount(this);
	},

	handleGraphics: function () {
		if (this._playerUsername && !this.nameTag) {
			this.nameTag = new IgeUiLabel()
					.width(100, false)
					.value(this._playerUsername)
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
			if (this.nameTag.value != this._playerUsername) {
				this.nameTag.value = this._playerUsername;
			}
		}
	},

	setPlayerUsername: function (pun) {
		this._playerUsername = pun;
		return this;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Player; }