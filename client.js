var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		//ige.timeScale(0.1);
		ige.showStats(1);

		// Load our textures
		var self = this;

		// Enable networking
		ige.addComponent(IgeNetIoComponent);

        // Enable The editor
        ige.addComponent(IgeEditorComponent);

        // Implement our game methods
		this.implement(ClientNetworkEvents);

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Load the textures we want to use
		this.textures = {
			ship: new IgeTexture('./assets/Pirate_Ship_Top_Down_64x64.png'),
            testmap: new IgeCellSheet('./assets/RPGpack_sheet.png', 20, 13),
		};

		ige.on('texturesLoaded', function () {
			// Ask the engine to start
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Start the networking (you can do this elsewhere if it
					// makes sense to connect to the server later on rather
					// than before the scene etc are created... maybe you want
					// a splash screen or a menu first? Then connect after you've
					// got a username or something?
					ige.network.start('http://localhost:2000', function () {
						// Setup the network command listeners
						ige.network.define('playerEntity', self._onPlayerEntity); // Defined in ./gameClasses/ClientNetworkEvents.js

						// Setup the network stream handler
						ige.network.addComponent(IgeStreamComponent)
							.stream.renderLatency(80) // Render the simulation 160 milliseconds in the past
							// Create a listener that will fire whenever an entity
							// is created because of the incoming stream data
							.stream.on('entityCreated', function (entity) {
								self.log('Stream entity created with ID: ' + entity.id());

							});

						self.mainScene = new IgeScene2d()
							.id('mainScene');

						// Create the scene
						self.scene1 = new IgeScene2d()
							.id('scene1')
                            //.backgroundPattern(new IgeTexture('./assets/Water_With_Particles_192x192.png'))
							.mount(self.mainScene);

						self.uiScene = new IgeScene2d()
							.id('uiScene')
							.ignoreCamera(true)
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

                        ige.addComponent(IgeTiledComponent)
                            .tiled.loadJson(Test_10x10, function (layerArray, layersById) {
                            // The return data from the tiled component are two arguments,
                            // the first is an array of IgeTextureMap instances, each one
                            // representing one of the Tiled map's layers. The ID of each
                            // instance is the same as the name assigned to the Tiled
                            // layer it represents. The second argument contains the same
                            // instances but each instance is stored in a property that is
                            // named after the layer it represents so instead of having to
                            // loop the array you can simply pick the layer you want via
                            // the name assigned to it like layersById['layer name']

                            // We can add all our layers to our main scene by looping the
                            // array or we can pick a particular layer via the layersById
                            // object. Let's give an example:

                            for (i = 0; i < layerArray.length; i++) {
                                // Check if the layer is a tile layer
                                if (layerArray[i].type === 'tilelayer') {
                                    // Tiled calculates tile width from left-most point to right-most
                                    // IGE calculates the tile width as the length of one side of the tile square.
                                    layerArray[i]
                                        .autoSection(20)
                                        .drawBounds(false)
                                        .drawBoundsData(false)
                                        .mount(self.mainScene);
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

						// Ask the server to create an entity for us
						ige.network.send('playerEntity');

						// We don't create any entities here because in this example the entities
						// are created server-side and then streamed to the clients. If an entity
						// is streamed to a client and the client doesn't have the entity in
						// memory, the entity is automatically created. Woohoo!

						// Enable console logging of network messages but only show 10 of them and
						// then stop logging them. This is a demo of how to help you debug network
						// data messages.
						ige.network.debugMax(10);
						ige.network.debug(true);

						// Create an IgeUiTimeStream entity that will allow us to "visualise" the
						// timestream data being interpolated by the player entity
						// self.tsVis = new IgeUiTimeStream()
						// 	.height(140)
						// 	.width(400)
						// 	.top(0)
						// 	.center(0)
						// 	.mount(self.uiScene);
                        //
						// self.custom1 = {
						// 	name: 'Delta',
						// 	value: 0
						// };
                        //
						// self.custom2 = {
						// 	name: 'Data Delta',
						// 	value: 0
						// };
                        //
						// self.custom3 = {
						// 	name: 'Offset Delta',
						// 	value: 0
						// };
                        //
						// self.custom4 = {
						// 	name: 'Interpolate Time',
						// 	value: 0
						// };
                        //
						// ige.watchStart(self.custom1);
						// ige.watchStart(self.custom2);
						// ige.watchStart(self.custom3);
						// ige.watchStart(self.custom4);
					});
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }