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
