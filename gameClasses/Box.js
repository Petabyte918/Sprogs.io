var Box = IgeEntityBox2d.extend({
    classId: 'Box',

    init: function () {
        IgeEntityBox2d.prototype.init.call(this);
        this.category("Box");

        var self = this;

        if (ige.isServer) {
            this.box2dBody({
                type: 'dynamic',
                linearDamping: 1,
                angularDamping: 1,
                allowSleep: true,
                bullet: false,
                fixedRotation: false,
                fixtures: [{
                    filter: {
                        categoryBits: 0x0002,
                        maskBits: 0xFFFF
                    },
                    density: 1.0,
                    friction: 0.5,
                    restitution: 0.2,
                    shape: {
                        type: 'circle'
                    }
                }]
            });

            this.streamMode(1);
        }

        if (ige.isClient) {
            // Define the texture this entity will use
            self._textureColor = "#68b8df";
            // self._outlineColor = "#68b8df";
            self.texture(ige.client.textures.orb);
                // .width(40)
                // .height(40);
        }
    },

    tick: function (ctx) {
        IgeEntityBox2d.prototype.tick.call(this, ctx);
    }
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Box; }