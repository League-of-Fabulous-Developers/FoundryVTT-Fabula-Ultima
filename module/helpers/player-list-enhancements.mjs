import { CharacterDataModel } from '../documents/actors/character/character-data-model.mjs';
import { SYSTEM } from './config.mjs';
import { Flags } from './flags.mjs';

/**
 * @param {UserData} user
 * @returns {HTMLAnchorElement}
 */
function createFpActionElement(user) {
	const fpActionAnchor = document.createElement('a');
	fpActionAnchor.dataset.action = 'spendFabula';
	fpActionAnchor.classList.add('flex0');
	fpActionAnchor.append(createFpDisplay(user));

	fpActionAnchor.addEventListener('click', (ev) => {
		ev.preventDefault();
		return spendMetaCurrency(user.character);
	});
	fpActionAnchor.addEventListener('contextmenu', (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
		return gainMetaCurrency(user.character);
	});
	return fpActionAnchor;
}

/**
 * @param {UserData} user
 * @returns {HTMLSpanElement}
 */
function createFpDisplay(user) {
	const fabulaPoints = user.character.system.resources.fp.value;
	const icon = fabulaPoints < 10 ? `counter_${fabulaPoints}` : 'add_circle';
	const tooltip = fabulaPoints >= 10 ? game.i18n.localize('FU.FabulaPoints') + ': ' + fabulaPoints : '';

	const fpDisplay = document.createElement('span');
	fpDisplay.classList.add('flex0', 'mats-o', 'font-size-20');
	fpDisplay.textContent = icon;

	if (fabulaPoints >= 10) {
		fpDisplay.dataset.tooltip = tooltip;
	}
	return fpDisplay;
}

/**
 * @param {Players} app
 * @param {HTMLElement} element
 * @param data
 */
function addFabulaPointDisplay(app, element, data) {
	const currentUser = game.user;
	const isGM = game.user.isGM;
	const actor = game.user.character;

	// Function to render uneditable fabula points for players (excluding current user)
	function renderUneditableFabulaPoints() {
		element.querySelectorAll('.player[data-user-id]').forEach((el) => {
			const userId = el.dataset.userId;
			const user = game.users.get(userId);

			if (userId !== currentUser.id && !isGM && user.character) {
				el.append(createFpDisplay(user));
			}
		});
	}

	// Function to render spendable fabula points for the current user
	function renderSpendableFabulaPoints() {
		if (actor && actor.system instanceof CharacterDataModel && !isGM) {
			const fpActionAnchor = createFpActionElement(currentUser);

			const userElement = element.querySelector(`.player[data-user-id=${currentUser.id}]`);
			userElement.append(fpActionAnchor);
		}
	}

	// Function to render spendable fabula points for GMs
	function renderGMFabulaPoints() {
		if (isGM) {
			element.querySelectorAll('.player[data-user-id]').forEach((userElement) => {
				const playerId = userElement.dataset.userId;
				const user = game.users.get(playerId);

				if (user.character && user.character.system instanceof CharacterDataModel) {
					const fpActionAnchor = createFpActionElement(user);
					userElement.append(fpActionAnchor);
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
	if (!actor) {
		return false;
	}
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
			(await foundry.applications.api.DialogV2.confirm({
				window: { title: game.i18n.format('FU.UseMetaCurrencyDialogTitle', { type: metaCurrency }) },
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

/**
 * @param {FUActor} actor
 * @return {Promise}
 */
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
		Hooks.on('renderPlayers', addFabulaPointDisplay);
		Hooks.on('updateActor', rerenderPlayerList);
	},
	spendMetaCurrency,
	gainMetaCurrency,
});
