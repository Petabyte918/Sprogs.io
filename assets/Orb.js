var image = {
	render: function (ctx, entity) {
		// Draw the player entity
		ctx.fillStyle = '#68b8df';
		ctx.strokeStyle = '#47a7d6';
		ctx.beginPath();
		ctx.moveTo(-entity._bounds2d.x2, -entity._bounds2d.y2 / 2);
		ctx.lineTo(-entity._bounds2d.x2 / 2, -entity._bounds2d.y2);
		ctx.lineTo(entity._bounds2d.x2 / 2, -entity._bounds2d.y2);
		ctx.lineTo(entity._bounds2d.x2, -entity._bounds2d.y2 / 2);
		ctx.lineTo(entity._bounds2d.x2, entity._bounds2d.y2 / 2);
		ctx.lineTo(entity._bounds2d.x2 / 2, entity._bounds2d.y2);
		ctx.lineTo(-entity._bounds2d.x2 / 2, entity._bounds2d.y2);
		ctx.lineTo(-entity._bounds2d.x2, entity._bounds2d.y2 / 2);
		ctx.lineTo(-entity._bounds2d.x2, -entity._bounds2d.y2 / 2);
		ctx.fill();
		ctx.stroke();
	}
};