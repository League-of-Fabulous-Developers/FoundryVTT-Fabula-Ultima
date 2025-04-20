import { FUPartySheet } from './sheets/actor-party-sheet.mjs';
import { Flags } from './helpers/flags.mjs';

const KEYBINDINGS = Object.freeze({
	openPartySheet: 'openPartySheet',
});

export const registerKeyBindings = async function () {
	game.keybindings.register(Flags.Scope, KEYBINDINGS.openPartySheet, {
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
};
