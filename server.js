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
							
							self._myMapDataFromId = {};
							self._myMapDataFromId['collisions'] = layersById.collisions.map._mapData;
							self._myMapDataFromId['islands'] = layersById.islands.map._mapData;
							self._myMapDataFromId['background'] = layersById.background.map._mapData;

							// Create collision boxes from the layers in the map
							ige.box2d.staticsFromMap(layersById.collisions);
							ige.box2d.staticsFromMap(layersById.islands);
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
			.setPlayerUsername(username)
			.streamMode(1)
			.mount(ige.server.scene1);

		var count = this.getOnlineUsers();

		console.log(ige.server.players[clientId]._playerUsername + " has joined the server");
		console.log(count + " user(s) online");
	},

	removePlayerFromList: function (clientId) {
		var username = ige.server.players[clientId]._playerUsername;
		delete ige.server.players[clientId];
		
		var count = this.getOnlineUsers();

		console.log(username + " has left the server");
		console.log(count + " user(s) online");
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

		var	tileChecker = function (tileData, tileX, tileY) {
				// If the map tile data is set, don't path along it
				return !tileData;
			};

		while (destTileX < 0 || destTileY < 0 || !this._myMapDataFromId['collisions'][destTileY] || !tileChecker(this._myMapDataFromId['collisions'][destTileY][destTileX]) ||
			!this._myMapDataFromId['islands'][destTileY] || !tileChecker(this._myMapDataFromId['islands'][destTileY][destTileX])) {

			destTileX = Math.random() * 75 | 0; // | rounds to int
			destTileY = Math.random() * 75 | 0;
		}
		
		return new IgePoint3d(destTileX * 64, destTileY * 64, 0);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }