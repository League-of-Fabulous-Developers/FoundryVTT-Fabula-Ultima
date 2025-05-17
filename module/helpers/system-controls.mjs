import { SYSTEM } from './config.mjs';

/**
 * @param {SceneControl[]} controls
 */
function initializeSystemControl(controls) {
	/** @type SceneControlTool[] */
	const tools = [];

	Hooks.callAll(SystemControls.HOOK_GET_SYSTEM_TOOLS, tools);

	controls[SYSTEM] = {
		name: SYSTEM,
		title: 'FU.UiControlTitle',
		icon: 'star-label fus-star2',
		tools: tools,
		layer: SYSTEM,
	};
}
let initialized;
export const SystemControls = Object.freeze({
	initialize() {
		if (!initialized) {
			initialized = true;
			CONFIG.Canvas.layers[SYSTEM] = {
				layerClass: SystemControlsLayer,
				group: 'interface',
			};

			Hooks.on('getSceneControlButtons', initializeSystemControl);
		}
	},
	HOOK_GET_SYSTEM_TOOLS: `${SYSTEM}.getSystemControlTools`,
});

class SystemControlsLayer extends foundry.canvas.layers.InteractionLayer {}
