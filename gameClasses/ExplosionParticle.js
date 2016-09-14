var ExplosionParticle = IgeEntityBox2d.extend({
    classId: 'ExplosionParticle',

    init: function (emitter) {
        this._emitter = emitter;
        IgeEntityBox2d.prototype.init.call(this);

        this._textureColor = "#ff0000";
        this._outlineColor = '#d60a0a';

        // Setup the particle default values
        this.addComponent(IgeVelocityComponent)
            .texture(ige.client.textures.orb)
            .width(6)
            .height(6)
            .layer(1)
            .category('ExplosionParticle');
    },

    destroy: function () {
        // Remove ourselves from the emitter
        if (this._emitter !== undefined) {
            this._emitter._particles.pull(this);
        }
        IgeEntityBox2d.prototype.destroy.call(this);
    }
});