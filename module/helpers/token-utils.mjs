/**
 * @param {FUActor} actor
 * @param input
 * @param fill
 * @returns {Promise<void>}
 */
async function showFloatyText(actor, input, fill) {
	if (!canvas.scene) {
		return;
	}

	const [token] = actor.getActiveTokens();
	if (!token) {
		return;
	}

	if (typeof input === 'number') {
		const gridSize = canvas.scene.grid.size;
		const scrollingTextArgs = [
			{ x: token.x + gridSize / 2, y: token.y + gridSize - 20 },
			Math.abs(input),
			{
				fill: fill ?? (input < 0 ? 'lightgreen' : 'white'),
				fontSize: 32,
				stroke: 0x000000,
				strokeThickness: 4,
			},
		];
		await token._animation;
		await canvas.interface?.createScrollingText(...scrollingTextArgs);
	} else {
		const gridSize = canvas.scene.grid.size;
		const scrollingTextArgs = [
			{ x: token.x + gridSize / 2, y: token.y + gridSize - 20 },
			input,
			{
				fill: fill ?? 'white',
				fontSize: 32,
				stroke: 0x000000,
				strokeThickness: 4,
			},
		];
		await token._animation;
		await canvas.interface?.createScrollingText(...scrollingTextArgs);
	}
}

export const TokenUtils = Object.freeze({
	showFloatyText,
});
