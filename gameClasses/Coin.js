var Coin = IgeEntity.extend({
    classId: 'Coin',

    init: function () {
        IgeEntity.prototype.init.call(this);
        this.category("Coin");
        
        if (ige.isServer) {

            // TODO: Add a random value
            this.serverProperties = {
                value: 5,
                radius: 50
            };

            ige.server.coins.push(this);
            
            this.streamMode(1);
        }

        if (ige.isClient) {
            // TODO: assign the coin a better texture based off its value
            this.texture(ige.client.textures.coinBronze);
        }
    },

    tick: function (ctx) {
        if (ige.isServer) {
            var players = ige.server.players;
            for (var playerId in players) {
                if (this.isWithinRange(players[playerId].worldPosition())) {
                    this.grabCoin(players[playerId]);
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
    
    grabCoin: function (player) {
        if (ige.isServer) {
            player.addToScore(this.serverProperties.value);

            this.spawnNewCoin();
            this.destroy();
        }
    },

    spawnNewCoin: function () {
        if (ige.isServer) {
            var spawnpoint = ige.server.getCoinSpawnPoint();

            new Coin()
                .translateTo(spawnpoint.x, spawnpoint.y, spawnpoint.z)
                .mount(ige.server.mainScene)
        }
    }
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Coin; }