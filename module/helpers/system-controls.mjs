import { SYSTEM } from './config.mjs';

/**
 * @typedef SceneControlTool
 * The data structure for a single tool in the {@link SceneControl#tools} record.
 * @property {string} name
 * @property {number} order
 * @property {string} title
 * @property {string} icon
 * @property {boolean} [visible]
 * @property {boolean} [toggle]
 * @property {boolean} [active]
 * @property {boolean} [button]
 * @property {(event: Event, active: boolean) => void} [onChange]   A callback invoked when the tool is activated
 * or deactivated
 * @property {ToolclipConfiguration} [toolclip]                     Configuration for rendering the tool's toolclip
 */

/**
 * @typedef SceneControl
 * The data structure for a set of controls in the {@link SceneControls#controls} record.
 * @property {string} name
 * @property {number} order
 * @property {string} title
 * @property {string} icon
 * @property {boolean} [visible]
 * @property {Record<string, SceneControlTool>} tools
 * @property {string} activeTool
 * @property {(event: Event, active: boolean) => void} [onChange]
 * A callback invoked when control set is activated or deactivated
 * @property {(event: Event, tool: SceneControlTool) => void} [onToolChange]
 * A callback invoked when the active tool changes
 */

/**
 * @param {Record<string, SceneControl>} controls
 * @remarks {@link https://foundryvtt.com/api/v13/classes/foundry.applications.ui.SceneControls.html#controls}
 */
function initializeSystemControl(controls) {
	/** @type SceneControlTool[] */
	const tools = {};

	Hooks.callAll(SystemControls.HOOK_GET_SYSTEM_TOOLS, tools);

	controls[SYSTEM] = {
		name: SYSTEM,
		title: 'FU.UiControlTitle',
		icon: 'fus-star2',
		tools: tools,
		activeTool: '',
		onChange: (event, active) => {},
		layer: SYSTEM,
	};
}

// Register the hook into Foundry
let initialized;
class SystemControlsLayer extends foundry.canvas.layers.InteractionLayer {}
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
