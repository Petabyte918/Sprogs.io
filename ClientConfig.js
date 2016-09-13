var igeClientConfig = {
	include: [
		/* tile maps */
		'./assets/maps/Green_Islands_75x75.js',

		/* game classes */
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/Box.js',
		'./gameClasses/Projectile.js',
		'./gameClasses/Player.js',
		'./gameClasses/ThrustParticle.js',

		/* standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }