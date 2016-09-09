var igeClientConfig = {
	include: [
		/* maps */
		'./assets/maps/Green_Islands_75x75.js',

		/* scripts */
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/Player.js',

		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }