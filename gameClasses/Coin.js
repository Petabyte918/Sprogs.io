var Coin = IgeEntity.extend({
    classId: 'Coin',

    init: function (spawnMore) {
        IgeEntity.prototype.init.call(this);
        this.category("Coin");
        
        if (spawnMore == undefined) spawnMore = true;

        // TODO: get value from server to display the correct texture
        var rarity = Math.ceil(Math.random() * 100);
        if (ige.isClient) var coinTexture = ige.client.textures.coinBronze;
        var value = 5;
        // if (rarity <= 100 && rarity > 90) {
        //     // if (ige.isClient) coinTexture = ige.client.textures.coinGold;
        //     value = 10;
        // } else if (rarity <= 90 && rarity > 60) {
        //     // if (ige.isClient) coinTexture = ige.client.textures.coinSilver;
        //     value = 7;
        // } else {
        //     // if (ige.isClient) coinTexture = ige.client.textures.coinBronze;
        //     value = 5;
        // }

        if (ige.isServer) {
            this.serverProperties = {
                spawnMore: spawnMore,
                value: value,
                radius: 60
            };

            ige.server.coins.push(this);
            
            this.streamMode(1);
        }

        if (ige.isClient) {
            this.texture(coinTexture);
        }
    },

    tick: function (ctx) {
        if (ige.isServer) {
            var players = ige.server.players;
            for (var playerId in players) {
                if (players.hasOwnProperty(playerId)) {
                    if (this.isWithinRange(players[playerId].worldPosition())) {
                        this.grabCoin(players[playerId]);
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
    
    grabCoin: function (player) {
        if (ige.isServer && !player.playerProperties.isDead) {
            player.addToCoinScore(this.serverProperties.value);

            this.spawnNewCoin();
            this.destroy();
        }
    },

    spawnNewCoin: function () {
        if (ige.isServer && this.serverProperties.spawnMore) {
            console.log("spawend");
            ige.server.spawnNewCoin();
        }
    }
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Coin; }