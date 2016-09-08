var Player = IgeEntity.extend({
	classId: 'Player',

	init: function () {
		IgeEntity.prototype.init.call(this);

		var self = this;

		this.drawBounds(false);

		// Rotate to point upwards
		this.controls = {
			left: false,
			right: false,
			thrust: false
		};

		if (ige.isServer) {
			this.addComponent(IgeVelocityComponent);

            this.properties = {
                thrustVelocity: 0,          // current velocity
                maxThrustVelocity: 0.2,     // max velocity
                rotateVelocity: 3,          // divisor to calculate rotation velocity
                acceleration: 0.01,         // percent of maxThrust to increase by every tick
                friction: 0.025             // percent of thrust to decrease by every tick
            };
		}

		if (ige.isClient) {
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
			this.handleMovement();
		}
		/* CEXCLUDE */

		if (ige.isClient) {
			this.handleInput();
		}

		// Call the IgeEntity (super-class) tick() method
		IgeEntity.prototype.tick.call(this, ctx);
	},

	handleMovement: function () {
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
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Player; }