var igeClientConfig = {
	include: [
		/* maps */
		'./assets/maps/Test_10x10.js',

		/* scripts */
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/Player.js',

		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }