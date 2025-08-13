import { SYSTEM } from './config.mjs';

/**
 * @typedef SystemControlTool
 * @property {string} name
 * @property {string} icon
 * @property {boolean} [visible]
 * @property {boolean} [toggle]
 * @property {boolean} [active]
 * @property {(event: Event, active: boolean) => void} [onClick]
 */

// Register the hook into Foundry
let initialized;
export const SystemControls = Object.freeze({
	initialize() {
		if (!initialized) {
			Hooks.on('renderPlayers', (app, element) => {
				const containerElement = document.createElement('div');
				containerElement.classList.add('system-controls');

				/** @type {SystemControlTool[]} */
				const systemTools = [];
				Hooks.callAll(SystemControls.HOOK_GET_SYSTEM_TOOLS, systemTools);

				const menuItems = systemTools
					.filter((tool) => tool.visible !== false)
					.map((tool) => {
						const toolButton = document.createElement('button');
						toolButton.type = 'button';
						toolButton.classList.add('control', 'ui-control');
						toolButton.innerHTML = `<i class="${tool.icon}"></i>`;
						toolButton.dataset.tooltip = game.i18n.localize(tool.name);
						toolButton.dataset.tooltipDirection = game.tooltip.constructor.TOOLTIP_DIRECTIONS.UP;

						if (tool.toggle) {
							let active = tool.active;
							toolButton.classList.add('toggle');
							toolButton.ariaPressed = active;
							toolButton.addEventListener('click', (e) => {
								active = !active;
								toolButton.ariaPressed = active;
								if (tool.onClick) {
									tool.onClick(e, active);
								}
							});
						} else {
							if (tool.onClick) {
								toolButton.addEventListener('click', (e) => {
									tool.onClick(e, false);
								});
							}
						}
						return toolButton;
					});

				containerElement.append(...menuItems);
				element.prepend(containerElement);
			});
		}
	},
	HOOK_GET_SYSTEM_TOOLS: `${SYSTEM}.getSystemControlTools`,
});
