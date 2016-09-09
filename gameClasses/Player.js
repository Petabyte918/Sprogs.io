var Player = IgeEntityBox2d.extend({
	classId: 'Player',

	init: function () {
		IgeEntityBox2d.prototype.init.call(this);

		var self = this;

		this.drawBounds(false);

		// Used to tell the server when we give input
		this.controls = {
			left: false,
			right: false,
			thrust: false
		};

		if (ige.isServer) {
			this.translateTo(2325, 2325, 0);

			if(ige.box2d) {
				var fixDefs = self.setUpCollider();
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
					maxThrustVelocity: 8,     // max velocity
					rotationDivisor: 3.3,          // divisor to calculate rotation velocity
					acceleration: 0.03,         // percent of maxThrust to increase by every tick
					friction: 0.04             // percent of thrust to decrease by every tick
				};
			}

			this.addComponent(IgeVelocityComponent);
		}

		if (ige.isClient) {
			this.networkDebugMode = true;

			this.clientProperties = {
				prev_position: new IgePoint3d(0,0,0)
			};

			this.switches = {
				thrustEmitterStarted: false
			};

			this.texture(ige.client.textures.ship)
			.width(96)
			.height(96);

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
		}

		// Define the data sections that will be included in the stream
		this.streamSections(['transform', 'score']);
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
			if (data) {
				// We have been given new data!
				this._score = data;
			} else {
				// Return current data
				return this._score;
			}
		} else {
			// The section was not one that we handle here, so pass this
			// to the super-class streamSectionData() method - it handles
			// the "transform" section by itself
			return IgeEntity.prototype.streamSectionData.call(this, sectionId, data);
		}
	},

	/**
	 * Called every frame by the engine when this entity is mounted to the
	 * scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		/* CEXCLUDE */
		if (ige.isServer) {
			this.handleBox2dMovement();
		}
		/* CEXCLUDE */

		if (ige.isClient) {
			this.handleInput();

			this.handleEmitters();
		}

		// Call the IgeEntity (super-class) tick() method
		IgeEntityBox2d.prototype.tick.call(this, ctx);
	},

	handleBox2dMovement: function () {
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
		this.serverProperties.thrustVelocity *= 1 - fric;
	},

	handleInput: function () {
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

	setUpCollider: function () {
		// Points created in Physics Body Editor, set to the origin, rounded and copied over
		var y_offset = 0.1;
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
		collisionPoly.multiply(-4);

		// Now convert this polygon into an array of triangles
		var triangles = collisionPoly.triangulate();

		// for every triangle in triangles, create a new fixture and append it to fixDefs
		var fixDefs = [];
		for (var i = 0; i < triangles.length; i++) {
			fixDefs.push({
				shape: {
					type: 'polygon',
					data: triangles[i]
				}
			});
		}

		return fixDefs;
	},

	handleEmitters: function () {
		var clientVel = this.getClientVelocity();
		if (clientVel > 1 && !this.switches.thrustEmitterStarted) {
			this.thrustEmitter.start();
			this.switches.thrustEmitterStarted = true;
			console.log("Start")
		} else if (clientVel < 0.75 && this.switches.thrustEmitterStarted){
			this.thrustEmitter.stop();
			this.switches.thrustEmitterStarted = false;
			console.log("Stop")
		}
	},

	// Returns the client's velocity in units/tick
	getClientVelocity: function () {
		var deltaX = this.worldPosition().x - this.clientProperties.prev_position.x;
		var deltaY = this.worldPosition().y - this.clientProperties.prev_position.y;
		var vel = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));

		this.clientProperties.prev_position = this.worldPosition();
		return vel
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Player; }