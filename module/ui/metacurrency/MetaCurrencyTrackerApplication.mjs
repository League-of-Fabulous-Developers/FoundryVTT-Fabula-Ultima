import { SETTINGS } from '../../settings.js';
import { SystemControls } from '../../helpers/system-controls.mjs';

import { SYSTEM } from '../../helpers/config.mjs';
import { Flags } from '../../helpers/flags.mjs';
import { CharacterDataModel } from '../../documents/actors/character/character-data-model.mjs';
import { NpcDataModel } from '../../documents/actors/npc/npc-data-model.mjs';
import FUApplication from '../application.mjs';

/**
 * @param {SystemControlTool[]} tools
 */
function onGetSystemTools(tools) {
	tools.push({
		name: 'FU.AppMetaCurrencyTrackerTitle',
		icon: 'fa-solid fa-chart-line',
		onClick: () => renderApp(),
	});
}
Hooks.on(SystemControls.HOOK_GET_SYSTEM_TOOLS, onGetSystemTools);

let app;
const renderApp = () => (app ??= new MetaCurrencyTrackerApplication()).render(true);

Hooks.on('chatMessage', handleChatCommand);

const regExp = /^\/(fabula|ultima|metacurrency)$/i;

function handleChatCommand(chatLog, message) {
	if (regExp.test(message)) {
		renderApp();
		return false;
	}
}

Hooks.on('createChatMessage', handleMetaCurrencyUsed);

/**
 * @param {ChatMessage} document
 * @param options
 * @param {string} userId
 */
function handleMetaCurrencyUsed(document, options, userId) {
	if (!game.settings.get(SYSTEM, SETTINGS.metaCurrencyAutomation)) {
		return;
	}
	let useMetaCurrency = document.getFlag(SYSTEM, Flags.ChatMessage.UseMetaCurrency);
	if (useMetaCurrency && game.users.activeGM?.isSelf) {
		const speakerActor = ChatMessage.getSpeakerActor(document.speaker);
		if (speakerActor) {
			if (speakerActor.system instanceof CharacterDataModel) {
				increment(SETTINGS.metaCurrencyFabula);
			}
			if (speakerActor.system instanceof NpcDataModel) {
				increment(SETTINGS.metaCurrencyUltima);
			}
		}
	}
	if (useMetaCurrency && game.user.id === userId && !game.users.activeGM) {
		ui.notifications.warn('FU.MetaCurrencyAutomationNoActiveGm', { localize: true });
	}
}

function increment(setting) {
	const oldValue = game.settings.get(SYSTEM, setting);
	game.settings.set(SYSTEM, setting, oldValue + 1);
}

export class MetaCurrencyTrackerApplication extends FUApplication {
	static get HOOK_UPDATE_META_CURRENCY() {
		return `${SYSTEM}.updateMetaCurrency`;
	}

	/** @type ApplicationConfiguration */
	static DEFAULT_OPTIONS = {
		window: { title: 'FU.AppMetaCurrencyTrackerTitle', minimizable: false },
		classes: ['form', 'backgroundstyle', 'projectfu', 'unique-dialog'],
		form: {
			closeOnSubmit: false,
			submitOnChange: true,
			handler: MetaCurrencyTrackerApplication.#updateMetaCurrency,
		},
		actions: {
			increment: MetaCurrencyTrackerApplication.#incrementMetaCurrency,
			calc: MetaCurrencyTrackerApplication.#calculateSessionExp,
			override: MetaCurrencyTrackerApplication.#overrideActivity,
		},
	};

	static PARTS = {
		main: {
			template: 'systems/projectfu/templates/app/meta-currency-tracker.hbs',
		},
	};

	#state;

	constructor() {
		super();
		const usedFabulaPoints = game.settings.get(SYSTEM, SETTINGS.metaCurrencyFabula);
		const usedUltimaPoints = game.settings.get(SYSTEM, SETTINGS.metaCurrencyUltima);
		this.#state = { fabula: usedFabulaPoints, ultima: usedUltimaPoints, activityOverride: {} };

		Hooks.on(MetaCurrencyTrackerApplication.HOOK_UPDATE_META_CURRENCY, () => {
			this.#state.fabula = game.settings.get(SYSTEM, SETTINGS.metaCurrencyFabula);
			this.#state.ultima = game.settings.get(SYSTEM, SETTINGS.metaCurrencyUltima);
			this.render();
		});

		if (this.options.editable) {
			Hooks.on('userConnected', () => this.render());
		}
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		context.object = this.#state;
		context.editable = game.user.isGM;
		context.players = game.users
			.filter((user) => !user.isGM)
			.filter((user) => user.character)
			.sort((a, b) => a - b);

		return context;
	}

	static async #updateMetaCurrency(event, form, formData) {
		const fabula = formData.get('fabula');
		if (game.settings.get(SYSTEM, SETTINGS.metaCurrencyFabula) !== fabula) {
			game.settings.set(SYSTEM, SETTINGS.metaCurrencyFabula, fabula);
		}

		const ultima = formData.get('ultima');
		if (game.settings.get(SYSTEM, SETTINGS.metaCurrencyUltima) !== ultima) {
			game.settings.set(SYSTEM, SETTINGS.metaCurrencyUltima, ultima);
		}
	}

	static #incrementMetaCurrency(event, element) {
		const currency = element.dataset.type;
		if (currency === 'fabula') {
			increment(SETTINGS.metaCurrencyFabula);
		}
		if (currency === 'ultima') {
			increment(SETTINGS.metaCurrencyUltima);
		}
	}

	static async #calculateSessionExp() {
		const { fabula: spentFabulaPoints, ultima: spentUltimaPoints } = this.#state;

		const activeCharacters = game.users
			.filter((user) => !user.isGM)
			.filter((user) => user.character)
			.filter((user) => (user.character.id in this.#state.activityOverride ? this.#state.activityOverride[user.character.id] : user.active))
			.map((user) => user.character);

		const baseExp = game.settings.get(SYSTEM, SETTINGS.metaCurrencyBaseExperience);
		const fabulaExp = Math.floor(spentFabulaPoints / Math.max(1, activeCharacters.length));

		const automaticallyDistributeExp = game.settings.get(SYSTEM, SETTINGS.metaCurrencyAutomaticallyDistributeExp);
		const data = {
			baseExp: baseExp,
			ultimaExp: spentUltimaPoints,
			spentFabula: spentFabulaPoints,
			fabulaExp: fabulaExp,
			totalExp: baseExp + spentUltimaPoints + fabulaExp,
			activeCharacters: activeCharacters,
			characterSectionTitle: automaticallyDistributeExp ? 'FU.ChatExpAwardExpAwardedTo' : 'FU.ChatExpAwardActiveCharacters',
		};

		/** @type ChatMessageData */
		const messageData = {
			flavor: game.i18n.localize('FU.ChatExpAwardFlavor'),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-exp-award.hbs', data),
		};

		ChatMessage.create(messageData);

		if (automaticallyDistributeExp) {
			Actor.updateDocuments(
				activeCharacters.map((character) => ({
					_id: character.id,
					'system.resources.exp.value': character.system.resources.exp.value + data.totalExp,
				})),
			);
		}

		const newFabulaValue = game.settings.get(SYSTEM, SETTINGS.metaCurrencyKeepExcessFabula) ? spentFabulaPoints % Math.max(1, activeCharacters.length) : 0;
		game.settings.set(SYSTEM, SETTINGS.metaCurrencyFabula, newFabulaValue);
		game.settings.set(SYSTEM, SETTINGS.metaCurrencyUltima, 0);
	}

	static #overrideActivity(event, element) {
		const actorId = element.dataset.actorId;
		const userId = element.dataset.userId;
		const user = game.users.get(userId);
		const currentOverride = this.#state.activityOverride[actorId];
		this.#state.activityOverride[actorId] = currentOverride ?? user.active ? 0 : 1;
		this.render();
	}

	static renderApp = () => (app ??= new MetaCurrencyTrackerApplication()).render(true);
}
