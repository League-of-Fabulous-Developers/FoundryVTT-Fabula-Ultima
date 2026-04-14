import { getSystemSetting } from '../settings.js';

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

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
function onRenderChatMessage(message, html) {
	const toggleSections = html.querySelectorAll('.pfu-chat-message__toggle-section');
	if (toggleSections.length === 0) return;

	// Get game settings (true means hide, false means show)
	const hideSettings = {
		tags: getSystemSetting('optionChatMessageHideTags'),
		quality: getSystemSetting('optionChatMessageHideQuality'),
		description: getSystemSetting('optionChatMessageHideDescription'),
		rollDetails: getSystemSetting('optionChatMessageHideRollDetails'),
	};

	const metaData = html.querySelector('.message-metadata');
	const button = document.createElement('a');
	button.classList.add('pfu-chat-message__toggle-section__button');
	const icon = document.createElement('i');
	icon.classList.add('fa', 'fa-eye-slash');
	button.appendChild(icon);
	button.addEventListener('click', () => {});
	metaData.appendChild(button);

	// TODO: Add a conditional button in the 'message-metadata' to toggle after this
	// Toggle visibility based on current state and settings
	toggleSections.forEach((section) => {
		const shouldHide = [
			{ className: 'accuracy-check-results', setting: hideSettings.rollDetails },
			{ className: 'damage-results', setting: hideSettings.rollDetails },
			{ className: 'description', setting: hideSettings.description },
			{ className: 'quality', setting: hideSettings.quality },
			{ className: 'tags', setting: hideSettings.tags },
			{ className: 'pfu-tags', setting: hideSettings.tags },
		].some(({ className, setting }) => section.classList.contains(className) && setting);

		//section.classList.toggle('shown', !shouldHide);
		section.classList.toggle('hidden', shouldHide);
	});
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
