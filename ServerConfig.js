var config = {
	include: [
		{name: 'Green_Islands_75x75', path: './assets/maps/Green_Islands_75x75'},
		{name: 'ServerNetworkEvents', path: './gameClasses/ServerNetworkEvents'},
		{name: 'Player', path: './gameClasses/Player'}
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = config; }