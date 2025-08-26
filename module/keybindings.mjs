import { FUPartySheet } from './sheets/actor-party-sheet.mjs';
import { Flags } from './helpers/flags.mjs';
import { FUTokenRuler } from './ui/token-ruler.mjs';

export const FUKeybindings = Object.freeze({
	openPartySheet: 'openPartySheet',
	showTokenDragRuler: 'showTokenDragRuler',
});

export const registerKeyBindings = async function () {
	game.keybindings.register(Flags.Scope, FUKeybindings.openPartySheet, {
		name: game.i18n.localize('FU.ActivePartySheetOpen'),
		editable: [
			{
				key: 'KeyP',
			},
		],
		onDown: () => {
			FUPartySheet.toggleActive();
			return true;
		},
		restricted: false, // Set to true if only GMs should use it
		precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
	});

	game.keybindings.register(Flags.Scope, FUKeybindings.showTokenDragRuler, {
		name: game.i18n.localize('FU.ShowTokenDragRulerKey'),
		editable: [
			{
				key: 'ShiftLeft',
			},
			{
				key: 'ShiftRight',
			},
		],
		restricted: false,
		precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		onDown: () => {
			if (CONFIG.Token.rulerClass.prototype instanceof FUTokenRuler || CONFIG.Token.rulerClass.prototype === FUTokenRuler.prototype) {
				FUTokenRuler.toggleVisibility();
			}
		},
		onUp: () => {
			if (CONFIG.Token.rulerClass.prototype instanceof FUTokenRuler || CONFIG.Token.rulerClass.prototype === FUTokenRuler.prototype) {
				FUTokenRuler.toggleVisibility();
			}
		},
	});
};
