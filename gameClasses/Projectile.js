var Projectile = IgeEntityBox2d.extend({
    classId: 'Projectile',

    init: function(id, mouseAngleFromPlayer) {
        IgeEntityBox2d.prototype.init.call(this);
        this.category("Projectile");
        
        if (ige.isServer) {
            if(ige.box2d){
                // Setup the box2d physics properties
                this.box2dBody({
                    type: 'dynamic',
                    linearDamping: 3,
                    angularDamping: 0.5,
                    allowSleep: false,
                    bullet: true,
                    fixtures: [{
                        filter: {
                            categoryBits: 0x0003,           // What level the collider is on
                            maskBits: 0x0002                // What level it listens on
                        },
                        shape: {
                            type: 'circle',
                            data: {
                                radius: 1
                            }
                        }
                    }]
                });

                var serverProperties = {
                    damage: 34,
                    velocity: 40,
                    distanceFromPlayer: 20
                };

                this.serverProperties = serverProperties;

                var canHurt = true;

                this.on('collisionStart', '.Player', function (contactData) {
                    if (contactData.igeEntityA()._category == "Player") {
                        if (canHurt) {
                            canHurt = false;
                            contactData.igeEntityA().hurt(serverProperties.damage);
                        }

                        contactData.igeEntityB().destroy();
                    }

                    if (contactData.igeEntityB()._category == "Player") {
                        if (canHurt) {
                            canHurt = false;
                            contactData.igeEntityB().hurt(this.serverProperties.damage);
                        }
                        contactData.igeEntityB().destroy();
                    }

                });
            }

            this.streamMode(1);
            this.lifeSpan(500);
        }

        if (ige.isClient) {
            this._textureColor = "#4f585c";
            this.texture(ige.client.textures.orb)
                .width(5)
                .height(5)
        }
    },
    
    shoot: function (pos, angle) {
        var dis = this.serverProperties.distanceFromPlayer;
        var vel = this.serverProperties.velocity;
        
        var dx = Math.cos(angle);
        var dy = Math.sin(angle);
        
        this.translateTo(dx * dis + pos.x, dy * dis + pos.y, 0);

        this._box2dBody.SetLinearVelocity(new IgePoint3d(vel * dx, vel * dy, 0));
    },

    hurt: function () {
        this.destroy();
    }
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Projectile; }