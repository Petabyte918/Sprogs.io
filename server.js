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
							.drawBounds(true)
							.mount(ige);

						// Load the tilemap's collisions
						// Textures are handled by the client
						ige.addComponent(IgeTiledComponent)
							.tiled.loadJson(Green_Islands_75x75, function (layerArray, layersById) {

							// Create collision boxes from the layers in the map
							ige.box2d.staticsFromMap(layersById.collisions);
							ige.box2d.staticsFromMap(layersById.islands);
						});

						new Box()
							.translateTo(2220, 2220, 0)
							.streamMode(1)
							.mount(self.scene1);
					}
				});
			});
	},

	addPlayerToList: function (clientId) {
		ige.server.players[clientId] = new Player(clientId)
			.drawBounds(false)
			.streamMode(1)
			.mount(ige.server.scene1);

		console.log("A user has joined the server");

		var count = this.getOnlineUsers();

		console.log(count + " users online");
	},

	removePlayerFromList: function (clientId) {
		delete ige.server.players[clientId];
		console.log("A user has left the server");

		var count = this.getOnlineUsers();

		console.log(count + " users online");
	},

	getOnlineUsers: function () {
		var count = 0;

		for (var playerId in ige.server.players) {
			count++;
		}

		return count;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }