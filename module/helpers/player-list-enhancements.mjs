import { CharacterDataModel } from '../documents/actors/character/character-data-model.mjs';
import { SYSTEM } from './config.mjs';
import { Flags } from './flags.mjs';

function addFabulaPointDisplay(app, html, data) {
	const userId = game.userId;
	const isGM = game.user.isGM;
	const character = game.user.character;

	// Function to render uneditable fabula points for players (excluding current user)
	function renderUneditableFabulaPoints() {
		html.find('#player-list .player[data-user-id]').each(function () {
			const playerId = this.dataset.userId;
			const user = game.users.get(playerId);

			if (playerId !== userId && !isGM && user.character) {
				const fabulaPoints = user.character.system.resources.fp.value;
				const icon = fabulaPoints < 10 ? `counter_${fabulaPoints}` : 'add_circle';
				const tooltip = fabulaPoints >= 10 ? game.i18n.localize('FU.FabulaPoints') + ': ' + fabulaPoints : '';
				$(this).append(`<span class="flex0 mats-o font-size-20" ${fabulaPoints >= 10 ? `data-tooltip="${tooltip}"` : ''}>${icon}</span>`);
			}
		});
	}

	// Function to render spendable fabula points for the current user
	function renderSpendableFabulaPoints() {
		if (character && character.system instanceof CharacterDataModel && !isGM) {
			const fabulaPoints = character.system.resources.fp.value;
			const icon = fabulaPoints < 10 ? `counter_${fabulaPoints}` : 'add_circle';
			const tooltip = fabulaPoints >= 10 ? game.i18n.localize('FU.FabulaPoints') + ': ' + fabulaPoints : '';

			html.find(`#player-list .player[data-user-id=${userId}]`).each(function () {
				$(this)
					.append(`<a class="flex0" data-user-id="${userId}" data-action="spendFabula"><span class="mats-o font-size-20" ${fabulaPoints >= 10 ? `data-tooltip="${tooltip}"` : ''}>${icon}</span></a>`)
					.find(`a[data-user-id="${userId}"][data-action="spendFabula"]`)
					.on('click', function (event) {
						event.preventDefault();
						character.spendMetaCurrency();
					})
					.on('contextmenu', function (event) {
						event.preventDefault();
						gainMetaCurrency(character);
					});
			});
		}
	}

	// Function to render spendable fabula points for GMs
	function renderGMFabulaPoints() {
		if (isGM) {
			html.find('#player-list .player[data-user-id]').each(function () {
				const playerId = this.dataset.userId;
				const user = game.users.get(playerId);

				if (user.character && user.character.system instanceof CharacterDataModel) {
					const charId = user.character._id;
					const fabulaPoints = user.character.system.resources.fp.value;
					const icon = fabulaPoints < 10 ? `counter_${fabulaPoints}` : 'add_circle';
					const tooltip = fabulaPoints >= 10 ? game.i18n.localize('FU.FabulaPoints') + ': ' + fabulaPoints : '';

					$(this)
						.append(`<a class="flex0" data-user-id="${charId}" data-action="spendFabula"><span class="mats-o font-size-20" ${fabulaPoints >= 10 ? `data-tooltip="${tooltip}"` : ''}>${icon}</span></a>`)
						.on('click', `a[data-user-id="${charId}"][data-action="spendFabula"]`, function (event) {
							event.preventDefault();
							spendMetaCurrency(user.character);
						})
						.on('contextmenu', `a[data-user-id="${charId}"][data-action="spendFabula"]`, function (event) {
							event.preventDefault();
							gainMetaCurrency(user.character);
						});
				}
			});
		}
	}

	// Call the rendering functions
	renderUneditableFabulaPoints();
	renderSpendableFabulaPoints();
	renderGMFabulaPoints();
}

/**
 * @param {FUActor} actor
 * @param {Boolean} force
 * @return {Promise<boolean>}
 */
async function spendMetaCurrency(actor, force = false) {
	let metaCurrency;
	if (actor.type === 'character') {
		metaCurrency = game.i18n.localize('FU.Fabula');
	}
	if (actor.type === 'npc' && actor.system.villain.value) {
		metaCurrency = game.i18n.localize('FU.Ultima');
	}
	if (metaCurrency && actor.system.resources.fp.value > 0) {
		const confirmed =
			force ||
			(await Dialog.confirm({
				title: game.i18n.format('FU.UseMetaCurrencyDialogTitle', { type: metaCurrency }),
				content: game.i18n.format('FU.UseMetaCurrencyDialogMessage', { type: metaCurrency }),
				options: { classes: ['projectfu', 'unique-dialog', 'dialog-reroll', 'backgroundstyle'] },
				rejectClose: false,
			}));
		if (confirmed && actor.system.resources.fp.value > 0) {
			/** @type ChatMessageData */
			const data = {
				speaker: ChatMessage.implementation.getSpeaker({ actor: actor }),
				flavor: game.i18n.format('FU.UseMetaCurrencyChatFlavor', { type: metaCurrency }),
				content: game.i18n.format('FU.UseMetaCurrencyChatMessage', { actor: actor.name, type: metaCurrency }),
				flags: {
					[SYSTEM]: {
						[Flags.ChatMessage.UseMetaCurrency]: true,
					},
				},
			};
			ChatMessage.create(data);
			await actor.update({
				'system.resources.fp.value': actor.system.resources.fp.value - 1,
			});
			return true;
		}
	} else {
		ui.notifications.info(game.i18n.format('FU.UseMetaCurrencyNotificationInsufficientPoints', { actor: actor.name, type: metaCurrency }));
		return false;
	}
}

async function gainMetaCurrency(actor) {
	let metaCurrency;
	if (actor.type === 'character') {
		metaCurrency = game.i18n.localize('FU.Fabula');
	}
	if (actor.type === 'npc' && actor.system.villain.value) {
		metaCurrency = game.i18n.localize('FU.Ultima');
	}
	if (metaCurrency) {
		await actor.update({
			'system.resources.fp.value': actor.system.resources.fp.value + 1,
		});
		/** @type ChatMessageData */
		const chatData = {
			user: game.user.id,
			speaker: ChatMessage.getSpeaker({ actor: actor.name }),
			flavor: game.i18n.format('FU.GainMetaCurrencyChatFlavor', { type: metaCurrency }),
			content: game.i18n.format('FU.GainMetaCurrencyChatMessage', { actor: actor.name, type: metaCurrency }),
		};
		ChatMessage.create(chatData);
	}
}

function rerenderPlayerList(actor) {
	if (actor.system instanceof CharacterDataModel) {
		ui.players.render();
	}
}

export const PlayerListEnhancements = Object.freeze({
	initialize() {
		Hooks.on('renderPlayerList', addFabulaPointDisplay);
		Hooks.on('updateActor', rerenderPlayerList);
	},
});
