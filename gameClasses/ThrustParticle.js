var ThrustParticle = IgeEntityBox2d.extend({
	classId: 'ThrustParticle',

	init: function (emitter) {
		this._emitter = emitter;
		IgeEntityBox2d.prototype.init.call(this);
		
		// Setup the particle default values
		this.addComponent(IgeVelocityComponent)
			.texture(ige.client.textures.orb)
			.width(4)
			.height(4)
			.layer(1)
			.category('thrustParticle');
	},

	destroy: function () {
		// Remove ourselves from the emitter
		if (this._emitter !== undefined) {
			this._emitter._particles.pull(this);
		}
		IgeEntityBox2d.prototype.destroy.call(this);
	}
});