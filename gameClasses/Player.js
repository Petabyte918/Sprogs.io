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
					linearDamping: 3,
					angularDamping: 7,
					allowSleep: true,
					fixedRotation: false,
					fixtures: fixDefs
				});

				this.box2dProperties = {
					thrustVelocity: 5,          // current velocity
					rotateVelocity: 2           // divisor to calculate rotation velocity
				};
			}

			this.addComponent(IgeVelocityComponent);

            this.properties = {
                thrustVelocity: 0,          // current velocity
                maxThrustVelocity: 0.3,     // max velocity
                rotateVelocity: 3,          // divisor to calculate rotation velocity
                acceleration: 0.01,         // percent of maxThrust to increase by every tick
                friction: 0.025             // percent of thrust to decrease by every tick
            };
		}

		if (ige.isClient) {
			self.networkDebugMode = true;

			self.texture(ige.client.textures.ship)
			.width(96)
			.height(96);
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
		}

		// Call the IgeEntity (super-class) tick() method
		IgeEntityBox2d.prototype.tick.call(this, ctx);
	},

	handleBox2dMovement: function () {
		var thrustVelocity = this.box2dProperties.thrustVelocity;
		var rotateVelocity = this.box2dProperties.rotateVelocity;

		if (this.controls.left) {
			this._box2dBody.SetAngularVelocity(-rotateVelocity);
			this._box2dBody.SetAwake(true);
		} if (this.controls.right) {
			this._box2dBody.SetAngularVelocity(rotateVelocity);
			this._box2dBody.SetAwake(true);
		}

		if (this.controls.thrust) {
			var angle = this._rotate.z + Math.radians(-90);
			var xComponent = Math.cos(angle);
			var yComponent = Math.sin(angle);

			this._box2dBody.SetLinearVelocity(new IgePoint3d(thrustVelocity * xComponent, thrustVelocity * yComponent, 0));
			this._box2dBody.SetAwake(true);
		}
	},

	handleNonPhysicsMovement: function () {
		// Declare friction here so we can disable it when accelerating
		var fric = this.properties.friction;

		// Calculate rotateVelocity based on current thrustVelocity
		var rotateVelocity = this.properties.thrustVelocity / this.properties.rotateVelocity;

		if (this.controls.left) {
			this.rotateBy(0, 0, Math.radians(-rotateVelocity * ige._tickDelta));
		}

		if (this.controls.right) {
			this.rotateBy(0, 0, Math.radians(rotateVelocity * ige._tickDelta));
		}

		// Apply acceleration and disable friction
		if (this.controls.thrust) {
			if (this.properties.thrustVelocity < this.properties.maxThrustVelocity) {
				this.properties.thrustVelocity += this.properties.maxThrustVelocity * this.properties.acceleration;
				fric = 0;
			}
		}

		// Always apply velocity in the direction the ship is pointing
		this.velocity.byAngleAndPower(this._rotate.z + Math.radians(-90), this.properties.thrustVelocity);

		// Apply friction to the current thrustVelocity
		this.properties.thrustVelocity *= 1 - fric;
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
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Player; }