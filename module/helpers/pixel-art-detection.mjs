import { SYSTEM } from './config.mjs';
import { SETTINGS } from '../settings.js';

let initialized = false;

const onRender = (app, element) => {
	element.querySelectorAll('img').forEach((img) => {
		const onLoad = () => {
			const { width, height, naturalWidth, naturalHeight } = img;
			const imageSmallerThanElement = naturalWidth < width && naturalHeight < height;
			if (imageSmallerThanElement) {
				img.style.imageRendering = 'pixelated';
			}
			img.removeEventListener('load', onLoad);
		};
		img.addEventListener('load', onLoad);
		if (img.complete && img.naturalWidth > 0) {
			onLoad();
		}
	});
};

export const PixelArtDetection = {
	initialize: () => {
		if (initialized) return;
		initialized = true;

		if (!game.settings.get(SYSTEM, SETTINGS.pixelArtDetection)) return;

		Hooks.on('renderDocumentSheetV2', onRender);

		Hooks.on('renderDocumentDirectory', onRender);

		Hooks.on('renderChatMessageHTML', onRender);
	},
};
