import { SYSTEM } from '../helpers/config.mjs';

/**
 * The sidebar chat tab.
 *
 * @remarks This is overridden here to ensure its ContextMenu is given a fixed position, rather than being constrained within the bounds of the ChatLog
 * @extends {foundry.applications.sidebar.tabs.ChatLog}
 * @mixes HandlebarsApplication
 */
export class FUChatLog extends foundry.applications.sidebar.tabs.ChatLog {
	/**
	 * _toggleNotifications is where Foundry injects the chat controls, which is weird and unexpected
	 * @param {object} options
	 */
	_toggleNotifications(options = {}) {
		super._toggleNotifications(options);
		if (ui.chat.popout?.rendered && !this.isPopout) return;

		const chatControls = document.getElementById('chat-controls');

		if (!chatControls.querySelector(`[data-role="pfu-settings-button"]`)) {
			const container = chatControls.querySelector('.control-buttons');
			if (container instanceof HTMLElement) container.prepend(this._createSettingsButton());
		}
	}

	/**
	 * Creates button element to open chat message settings
	 * @returns {HTMLElement}
	 */
	_createSettingsButton() {
		const button = document.createElement('button');
		button.setAttribute('type', 'button');
		button.dataset.role = 'pfu-settings-button';
		button.classList.add('ui-control', 'icon', 'fa-solid', 'fa-gears');

		const menu = game.settings.menus.get(`${SYSTEM}.myChatMessageOptions`);
		if (menu) {
			button.dataset.tooltip = menu.label;
		}

		button.addEventListener('click', () => {
			// The key for this menu is hard-coded in settings
			const menu = game.settings.menus.get(`${SYSTEM}.myChatMessageOptions`);
			if (menu) {
				new menu.type().render({ force: true });
			}
		});
		return button;
	}

	_createContextMenu(handler, selector, { container, hookName, parentClassHooks, ...options } = {}) {
		container ??= this.element;
		hookName ??= 'get{}ContextOptions';
		const menuItems = this._doEvent(handler, { hookName, parentClassHooks, hookResponse: true });
		if (!menuItems.length) return null;

		return new foundry.applications.ux.ContextMenu.implementation(container, selector, menuItems, {
			jQuery: false,
			fixed: true,
			...options,
		});
	}
}
