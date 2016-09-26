var Harbor = IgeEntity.extend({
    classId: 'Harbor',

    init: function () {
        IgeEntity.prototype.init.call(this);
        this.category("Harbor");

        if (ige.isServer) {
            this.serverProperties = {
                radius: 156
            };

            this.streamMode(1);
        }

        if (ige.isClient) {
            // this.texture(ige.client.textures.orb);
        }
    },

    tick: function (ctx) {
        if (ige.isServer) {
            var players = ige.server.players;
            for (var playerId in players) {
                if (players.hasOwnProperty(playerId)) {
                    if (this.isWithinRange(players[playerId].worldPosition())) {
                        this.cashInCoins(players[playerId]);
                    }
                }
            }
        }

        IgeEntity.prototype.tick.call(this, ctx);
    },

    isWithinRange: function (playerPos) {
        var myPos = this.worldPosition();
        var radius = this.serverProperties.radius;

        var x = Math.abs(myPos.x - playerPos.x);
        var y = Math.abs(myPos.y - playerPos.y);

        return x*x + y*y <= radius*radius;
    },

    cashInCoins: function (player) {
        if (ige.isServer) {
            player.cashInCoins();
        }
    }
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Harbor; }