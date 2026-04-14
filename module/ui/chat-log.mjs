import { getSystemSetting, SETTINGS } from '../settings.js';

/**
 * The sidebar chat tab.
 *
 * @remarks This is overridden here to ensure its ContextMenu is given a fixed position, rather than being constrained within the bounds of the ChatLog
 * @extends {foundry.applications.sidebar.tabs.ChatLog}
 * @mixes HandlebarsApplication
 */
export class FUChatLog extends foundry.applications.sidebar.tabs.ChatLog {
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

// These icons refer the CURRENT state
const SHOWN_ICON = 'fa-eye';
const HIDDEN_ICON = 'fa-eye-slash';

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
function onRenderChatMessage(message, html) {
	const toggleSections = html.querySelectorAll('.pfu-chat-message__toggle-section');
	if (toggleSections.length === 0) return;

	// Get game settings (true means hide, false means show)
	const settings = {
		tags: getSystemSetting(SETTINGS.optionChatMessageHideTags),
		quality: getSystemSetting(SETTINGS.optionChatMessageHideQuality),
		description: getSystemSetting(SETTINGS.optionChatMessageHideDescription),
		rollDetails: getSystemSetting(SETTINGS.optionChatMessageHideRollDetails),
	};

	const hideAnything = Object.values(settings).some((hide) => hide === true);
	if (!hideAnything) {
		return;
	}

	const toggleVisibility = (visible) => {
		toggleSections.forEach((section) => {
			const shouldAlwaysShow = [
				{ className: 'accuracy-check-results', setting: settings.rollDetails },
				{ className: 'damage-results', setting: settings.rollDetails },
				{ className: 'description', setting: settings.description },
				{ className: 'quality', setting: settings.quality },
				{ className: 'tags', setting: settings.tags },
				{ className: 'pfu-tags', setting: settings.tags },
			].some(({ className, setting }) => section.classList.contains(className) && !setting);

			section.classList.toggle('hidden', !shouldAlwaysShow && !visible);
		});
	};

	const setIconTooltip = (icon, visible) => {
		icon.setAttribute('data-tooltip', game.i18n.localize(visible ? 'FU.ChatMessageShow' : 'FU.ChatMessageHide'));
	};

	// Add a button to do the toggle
	if (hideAnything) {
		const metaData = html.querySelector('.message-metadata');
		const button = document.createElement('a');
		button.classList.add('pfu-chat-message__toggle-section__button');
		const icon = document.createElement('i');
		icon.classList.add('fa', HIDDEN_ICON);
		setIconTooltip(icon, false);
		button.appendChild(icon);
		button.addEventListener('click', (event) => {
			const icon = event.target;
			const visible = icon.classList.contains(SHOWN_ICON);
			if (visible) {
				icon.classList.add(HIDDEN_ICON);
				icon.classList.remove(SHOWN_ICON);
			} else {
				icon.classList.remove(HIDDEN_ICON);
				icon.classList.add(SHOWN_ICON);
			}
			setIconTooltip(icon, visible);
			toggleVisibility(!visible);
		});
		metaData.lastChild.before(button);
	}

	// Apply the default
	toggleVisibility(false);
}

Hooks.on('renderChatMessageHTML', onRenderChatMessage);

/**
 * @desc Toggles the whole chat message section.
 */
document.addEventListener('click', (event) => {
	const toggleLink = event.target.closest('.pfu-chat-message__toggle');
	if (!toggleLink) return;

	const chatMessage = toggleLink.closest('.chat-message');
	const chatMessageContent = chatMessage.querySelector('.message-content');
	const toggleIcon = toggleLink.querySelector('.toggle-icon');
	const isHidden = toggleIcon.classList.contains('fa-chevron-up');

	if (isHidden) {
		chatMessageContent.classList.add('hidden');
	} else {
		chatMessageContent.classList.remove('hidden');
	}

	// Update toggle icon and tooltip
	const newState = !isHidden;
	toggleIcon.classList.toggle('fa-chevron-up', newState);
	toggleIcon.classList.toggle('fa-chevron-down', !newState);
	toggleLink.setAttribute('data-tooltip', game.i18n.localize(newState ? 'FU.ChatMessageHide' : 'FU.ChatMessageShow'));
});
