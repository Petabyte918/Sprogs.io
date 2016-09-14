var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		// Load our textures
		var self = this;

		// Enable networking
		ige.addComponent(IgeNetIoComponent);

        // Enable The editor
        // ige.addComponent(IgeEditorComponent);

        // Implement our game methods
		this.implement(ClientNetworkEvents);

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Load the textures we want to use
		this.textures = {
			ship: new IgeTexture('./assets/Pirate_Ship_Top_Down_64x64.png'),
			orb: new IgeTexture('./assets/Orb.js')
		};

		ige.on('texturesLoaded', function () {
			// Ask the engine to start
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Start the networking (you can do this elsewhere if needed)
					ige.network.start('http://localhost:3000', function () {
						// Setup the network command listeners
						ige.network.define('playerEntity', self._onPlayerEntity); // defined in ./gameClasses/ClientNetworkEvents.js

						// Setup the network stream handler
						ige.network.addComponent(IgeStreamComponent).stream.renderLatency(80); // render the simulation 160 milliseconds in the past

						self.mainScene = new IgeScene2d()
							.id('mainScene');

						// Create a background scene
						self.scene0 = new IgeScene2d()
							.id('scene0')
							.depth(-1)
							.backgroundPattern(new IgeTexture('./assets/background.png'))
							.mount(self.mainScene);

						// Create a foreground scene
						self.scene1 = new IgeScene2d()
							.id('scene1')
							.depth(1)
							.mount(self.mainScene);

						self.uiScene = new IgeScene2d()
							.id('uiScene')
							.depth(10)
							.ignoreCamera(true)
							.mount(self.mainScene);

						// Create the main viewport and set the scene
						// it will "look" at as the new scene1 we just
						// created above
						self.vp1 = new IgeViewport()
							.id('vp1')
							.autoSize(true)	// auto resizes with the window
							.scene(self.mainScene)
							.minimumVisibleArea(700,700) // width in pixels and height in pixels will always be seen. Can abuse if stretched to extremes
							.drawBounds(false)
							.mount(ige);

						// Load the tilemap's textures
						// Collisions are handled by the server
                        ige.addComponent(IgeTiledComponent)
                            .tiled.loadJson(Green_Islands_75x75, function (layerArray, layersById) {

							// Loop through each layer we have and mount it to a scene
							for (i = 0; i < layerArray.length; i++) {
                                // Check if the layer is a tile layer
                                if (layerArray[i].type === 'tilelayer') {
                                    // Tiled calculates tile width from left-most point to right-most
                                    // IGE calculates the tile width as the length of one side of the tile square.
                                    layerArray[i]
                                        .autoSection(20)
                                        .drawBounds(false)
                                        .drawBoundsData(false)
                                        .mount(self.scene0);
                                }

                                // Check if the layer is an "object" layer
                                if (layerArray[i].type === 'objectlayer') {
                                    //layerArray[i].mount(self.backScene);
                                }
                            }
                        });

						// Define our player controls
						ige.input.mapAction('left', ige.input.key.a);
						ige.input.mapAction('right', ige.input.key.d);
						ige.input.mapAction('thrust', ige.input.key.w);
						ige.input.mapAction('fire', ige.input.mouse.button1);
						ige.input.mapAction('enter', ige.input.key.enter);

						self.handleMainPanMenu(self);
					});
				}
			});
		});
	},

	handleMainPanMenu: function (self) {
		// connect when we press enter
		window.addEventListener("keydown", function (e) {
			if (e.keyCode == "13" && !ige.client._myPlayerId) {
				self.panObject.destroy();
				self.panObjectController.cancel();
				// Ask the server to create an entity for us
				ige.network.send('playerEntity');
			}
		}, false);

		//display the menu and pan
		var lowerBound = 300;
		var upperBound = 4100;

		self.panObject = new IgeEntity()
		// .texture(self.textures.orb)
			.translateTo(getRandomInt(lowerBound, upperBound), getRandomInt(lowerBound, upperBound), 0)
			.mount(self.mainScene);

		ige.client.vp1.camera.trackTranslate(self.panObject, 300);

		self.panObjectController = new IgeInterval(function () {
			var x = getRandomInt(lowerBound, upperBound);
			var y = getRandomInt(lowerBound, upperBound);
			console.log(x,y);

			self.panObject._translate.tween()
				.stepTo({
					x: x,
					y: y
				}, 1000)
				.start()
		}, 5000);
	}
});

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
}

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }