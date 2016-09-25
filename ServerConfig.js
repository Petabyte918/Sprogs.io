var config = {
	include: [
		{name: 'Box', path: './gameClasses/Box'},
		{name: 'Coin', path: './gameClasses/Coin'},
		{name: 'Harbor', path: './gameClasses/Harbor'},
		{name: 'Projectile', path: './gameClasses/Projectile'},

		{name: 'Green_Islands_75x75', path: './assets/maps/Green_Islands_75x75'},
		{name: 'ServerNetworkEvents', path: './gameClasses/ServerNetworkEvents'},
		{name: 'Player', path: './gameClasses/Player'}
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = config; }