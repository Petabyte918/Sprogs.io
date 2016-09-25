var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		var self = this;
		ige.timeScale(1);

		// Define an object to hold references to our player entities
		this.players = {};

		// Add the server-side game methods / event handlers
		this.implement(ServerNetworkEvents);
		
		// Add physics and setup physics world
		ige.addComponent(IgeBox2dComponent)
			.box2d.sleep(true)
			.box2d.createWorld()
			.box2d.start();

		// Add the networking component
		ige.addComponent(IgeNetIoComponent)
			// Start the network server
			.network.start(3000, function () {
				// Networking has started so start the game engine
				ige.start(function (success) {
					// Check if the engine started successfully
					if (success) {
						// Create some network commands we will need
						// Defined in ./gameClasses/ServerNetworkEvents.js
						ige.network.define('playerEntity', self._onPlayerEntity);

						ige.network.define('playerControlLeftDown', self._onPlayerLeftDown);
						ige.network.define('playerControlRightDown', self._onPlayerRightDown);
						ige.network.define('playerControlThrustDown', self._onPlayerThrustDown);
						ige.network.define('playerControlFireDown', self._onPlayerFireDown);

						ige.network.define('playerControlLeftUp', self._onPlayerLeftUp);
						ige.network.define('playerControlRightUp', self._onPlayerRightUp);
						ige.network.define('playerControlThrustUp', self._onPlayerThrustUp);
						ige.network.define('playerControlFireUp', self._onPlayerFireUp);

						ige.network.on('connect', self._onPlayerConnect);
						ige.network.on('disconnect', self._onPlayerDisconnect);

						// Add the network stream component
						ige.network.addComponent(IgeStreamComponent)
							.stream.sendInterval(30) // Send a stream update once every 30 milliseconds
							.stream.start(); // Start the stream

						// Accept incoming network connections
						ige.network.acceptConnections(true);

						// Create the scene
						self.mainScene = new IgeScene2d()
							.id('mainScene');

						// Create the scene
						self.scene1 = new IgeScene2d()
							.id('scene1')
							.mount(self.mainScene);

						// Create the main viewport and set the scene
						// it will "look" at as the new scene1 we just
						// created above
						self.vp1 = new IgeViewport()
							.id('vp1')
							.autoSize(true)
							.scene(self.mainScene)
							.drawBounds(false)
							.mount(ige);

						// Load the tilemap's collisions
						// Textures are handled by the client
						ige.addComponent(IgeTiledComponent)
							.tiled.loadJson(Green_Islands_75x75, function (layerArray, layersById) {

							// save our layers for later access
							self._myMapDataFromId = {};
							self._myMapDataFromId['collisions'] = layersById.collisions.map._mapData;
							self._myMapDataFromId['islands'] = layersById.islands.map._mapData;
							self._myMapDataFromId['background'] = layersById.background.map._mapData;
							self._myMapDataFromId['shoreSpawns'] = layersById.shoreSpawns.map._mapData;
							self._myMapDataFromId['harbors'] = layersById.harbors.map._mapData;

							self.spawnCoins(25);
							self.spawnHarbors(self._myMapDataFromId['harbors']);

							// Create collision boxes from the layers in the map
							ige.box2d.staticsFromMap(layersById.collisions);
							ige.box2d.staticsFromMap(layersById.islands);
							console.log("Server Started																 *");
							console.log("------------------------------------------------------------------------------");
						});
					}
				});
			});
	},

	addPlayerToList: function (username, clientId) {
		var spawnPoint = this.getPlayerSpawnPoint();

		ige.server.players[clientId] = new Player(clientId)
			.drawBounds(false)
			.translateTo(spawnPoint.x, spawnPoint.y, spawnPoint.z)
			.rotateTo(0, 0, Math.random() * 2 * Math.PI)
			.setPlayerUsername(username)
			.streamMode(1)
			.mount(ige.server.scene1);

		this.playerCount = this.getOnlineUsers();

		console.log(ige.server.players[clientId].playerProperties.username + " has joined the server");
		console.log(this.playerCount + " user(s) online");
	},

	removePlayerFromList: function (clientId) {
		var username = ige.server.players[clientId].playerProperties.username;
		delete ige.server.players[clientId];

		this.playerCount = this.getOnlineUsers();

		console.log(username + " has left the server");
		console.log(this.playerCount + " user(s) online");
	},

	getOnlineUsers: function () {
		var count = 0;

		for (var playerId in ige.server.players) {
			count++;
		}

		return count;
	},

	getPlayerSpawnPoint: function () {
		var destTileX = - 1;
		var destTileY = -1;

		while (destTileX < 0 || destTileY < 0 || this.dontIncludeMapTilesById('collisions', destTileX, destTileY) ||
			this.dontIncludeMapTilesById('islands', destTileX, destTileY)){

			destTileX = Math.random() * 75 | 0; // | rounds to int
			destTileY = Math.random() * 75 | 0;
		}
		
		// TODO: swap this back out when done testing
		// return new IgePoint3d(destTileX * 64 + 0.5 * 64, destTileY * 64 + 0.5 * 64, 0);
		return new IgePoint3d(2400,2400,0)
	},

	// TODO: prevent coins spawning on top of each other
	getCoinSpawnPoint: function () {
		var destTileX = - 1;
		var destTileY = -1;

		while (destTileX < 0 || destTileY < 0 || this.dontIncludeMapTilesById('collisions', destTileX, destTileY) ||
			this.dontIncludeMapTilesById('islands', destTileX, destTileY) || this.includeMapTilesById('shoreSpawns', destTileX, destTileY)) {

			destTileX = Math.random() * 75 | 0; // | rounds to int
			destTileY = Math.random() * 75 | 0;
		}

		var spriteSize = 64;
		return new IgePoint3d((destTileX * spriteSize + spriteSize/2), (destTileY * spriteSize + spriteSize/2), 0);
	},

	tileChecker: function (tileData, tileX, tileY) {
		// If the map tile data is set, don't path along it
		return !tileData;
	},

	dontIncludeMapTilesById: function (id, destTileX, destTileY) {
		return !this._myMapDataFromId[id][destTileY]
			|| !this.tileChecker(this._myMapDataFromId[id][destTileY][destTileX]);
	},

	includeMapTilesById: function (id, destTileX, destTileY) {
		return !this._myMapDataFromId[id][destTileY]
			|| this.tileChecker(this._myMapDataFromId[id][destTileY][destTileX]);
	},

	// TODO: create a handler to always spawn more coins until a given cap
	spawnCoins: function (count) {
		this.coins = [];

		for (var i = 0; i < count; i++) {
			var spawnpoint = this.getCoinSpawnPoint();
			coin = new Coin()
				.translateTo(spawnpoint.x, spawnpoint.y, spawnpoint.z)
				.mount(this.mainScene);
		}
	},

	spawnHarbors: function (mapData) {
		var spriteSize = 64;

		for (var y in mapData) {
			if (mapData.hasOwnProperty(y)) {
				if (y) {
					for (var x in mapData[y]) {
						if (mapData[y].hasOwnProperty(x)) {
							if (x) {
								harbor = new Harbor()
									.translateTo((x * spriteSize + spriteSize/2), (y * spriteSize + spriteSize/2), 0)
									.mount(this.mainScene);
							}
						}
					}
				}
			}
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }