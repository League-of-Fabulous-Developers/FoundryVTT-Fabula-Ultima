/**
 * @param {Canvas} canvas
 * @param x
 * @param y
 * @param data
 */
function onDropCanvasData(canvas, { x, y, ...data }) {
	const dropTarget = [...canvas.tokens.placeables]
		.sort((a, b) => b.document.sort - a.document.sort)
		.find((token) => {
			const maximumX = token.x + (token.hitArea?.right ?? 0);
			const maximumY = token.y + (token.hitArea?.bottom ?? 0);
			return x >= token.x && y >= token.y && x <= maximumX && y <= maximumY;
		});

	const actor = dropTarget?.actor;
	if (actor) {
		const dataTransfer = new DataTransfer();
		dataTransfer.setData('text/plain', JSON.stringify(data));
		const event = new DragEvent('drop', { dataTransfer });
		actor.sheet._onDrop(event);
		return false;
	}

	return true;
}

export const CanvasDragDrop = {
	onDropCanvasData,
};
