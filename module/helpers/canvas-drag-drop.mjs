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
			const tokenDocument = token.document;
			const { x: tokenX, y: tokenY } = tokenDocument;
			const { width, height } = tokenDocument.getSize();
			const maximumX = tokenX + width;
			const maximumY = tokenY + height;
			return x >= tokenX && y >= tokenY && x <= maximumX && y <= maximumY;
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
