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

document.addEventListener('click', (event) => {
	const toggleLink = event.target.closest('.pfu-chat-message__toggle');
	if (!toggleLink) return;

	const chatMessage = toggleLink.closest('.chat-message');
	const isHidden = toggleIcon.classList.contains('fa-chevron-up');

	const toggleSections = chatMessage.querySelectorAll('.toggle-section');
	const toggleIcon = toggleLink.querySelector('.toggle-icon');

	// Get game settings (true means hide, false means show)
	const settings = {
		tags: game.settings.get('projectfu', 'optionChatMessageHideTags'),
		quality: game.settings.get('projectfu', 'optionChatMessageHideQuality'),
		description: game.settings.get('projectfu', 'optionChatMessageHideDescription'),
		rollDetails: game.settings.get('projectfu', 'optionChatMessageHideRollDetails'),
	};

	// Toggle visibility based on current state and settings
	toggleSections.forEach((section) => {
		const shouldAlwaysShow = [
			{ className: 'accuracy-check-results', setting: settings.rollDetails },
			{ className: 'damage-results', setting: settings.rollDetails },
			{ className: 'description', setting: settings.description },
			{ className: 'quality', setting: settings.quality },
			{ className: 'tags', setting: settings.tags },
		].some(({ className, setting }) => section.classList.contains(className) && !setting);

		section.classList.toggle('shown', shouldAlwaysShow || isHidden);
		section.classList.toggle('hidden', !shouldAlwaysShow && !isHidden);
	});

	// Update toggle icon and tooltip
	const newState = !isHidden;
	toggleIcon.classList.toggle('fa-chevron-up', newState);
	toggleIcon.classList.toggle('fa-chevron-down', !newState);
	toggleLink.setAttribute('data-tooltip', game.i18n.localize(newState ? 'FU.ChatMessageHide' : 'FU.ChatMessageShow'));
});
