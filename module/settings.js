export const registerSystemSettings = function () {
	// TODO: selective options for choosing which automation to disable
	game.settings.register('fabulaultima', 'disableAutomation', {
		name: 'Disable Automation',
		hint: 'Toggle to disable automatic calculations for certain fields.',
		scope: 'world', // or "client" if it's a client-specific setting
		config: true,
		default: false, // Initial value
		type: Boolean,
	});
};
