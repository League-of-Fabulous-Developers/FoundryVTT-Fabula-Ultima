import { SETTINGS } from '../../settings.js';
import { SystemControls } from '../../helpers/system-controls.mjs';

import { SYSTEM } from '../../helpers/config.mjs';
import { Flags } from '../../helpers/flags.mjs';
import { CharacterDataModel } from '../../documents/actors/character/character-data-model.mjs';
import { NpcDataModel } from '../../documents/actors/npc/npc-data-model.mjs';

Hooks.on(SystemControls.HOOK_GET_SYSTEM_TOOLS, (tools) => {
	tools[MetaCurrencyTrackerApplication.name] = {
		name: MetaCurrencyTrackerApplication.name,
		title: 'FU.AppMetaCurrencyTrackerTitle',
		icon: 'fa-solid fa-chart-line',
		button: true,
		active: false,
		toggle: false,
		onChange: (event, active) => renderApp(),
	};
});

let app;
const renderApp = () => (app ??= new MetaCurrencyTrackerApplication()).render(true);

Hooks.on('chatMessage', handleChatCommand);

const regExp = /^\/(fabula|ultima|metacurrency)$/i;

function handleChatCommand(chatLog, message, data) {
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

export class MetaCurrencyTrackerApplication extends FormApplication {
	static get HOOK_UPDATE_META_CURRENCY() {
		return `${SYSTEM}.updateMetaCurrency`;
	}

	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['form', 'backgroundstyle', 'projectfu', 'unique-dialog'],
			closeOnSubmit: false,
			editable: game.user.isGM,
			sheetConfig: false,
			submitOnChange: true,
			submitOnClose: true,
			minimizable: false,
			title: 'FU.AppMetaCurrencyTrackerTitle',
		});
	}

	get template() {
		return 'systems/projectfu/templates/app/meta-currency-tracker.hbs';
	}

	constructor() {
		const usedFabulaPoints = game.settings.get(SYSTEM, SETTINGS.metaCurrencyFabula);
		const usedUltimaPoints = game.settings.get(SYSTEM, SETTINGS.metaCurrencyUltima);
		super({ fabula: usedFabulaPoints, ultima: usedUltimaPoints, activityOverride: {} });

		Hooks.on(MetaCurrencyTrackerApplication.HOOK_UPDATE_META_CURRENCY, () => {
			this.object.fabula = game.settings.get(SYSTEM, SETTINGS.metaCurrencyFabula);
			this.object.ultima = game.settings.get(SYSTEM, SETTINGS.metaCurrencyUltima);
			this.render();
		});

		if (this.options.editable) {
			Hooks.on('userConnected', () => this.render());
		}
	}

	getData(options = {}) {
		const data = super.getData(options);

		data.players = game.users
			.filter((user) => !user.isGM)
			.filter((user) => user.character)
			.sort((a, b) => a - b);

		return data;
	}

	async _updateObject(event, formData) {
		if (game.settings.get(SYSTEM, SETTINGS.metaCurrencyFabula) !== formData.fabula) {
			game.settings.set(SYSTEM, SETTINGS.metaCurrencyFabula, formData.fabula);
		}
		if (game.settings.get(SYSTEM, SETTINGS.metaCurrencyUltima) !== formData.ultima) {
			game.settings.set(SYSTEM, SETTINGS.metaCurrencyUltima, formData.ultima);
		}
	}

	activateListeners(html) {
		html.find('button[data-action=calc-exp]').on('click', (event) => this.calculateExp(event));
		html.find('button[data-action=increment-fabula]').on('click', () => increment(SETTINGS.metaCurrencyFabula));
		html.find('button[data-action=increment-ultima]').on('click', () => increment(SETTINGS.metaCurrencyUltima));
		html.find('a[data-action=override][data-actor-id][data-user-id]').on('click', (event) => this.overrideActiveCharacter(event));
		return super.activateListeners(html);
	}

	async calculateExp(event) {
		const { fabula: spentFabulaPoints, ultima: spentUltimaPoints } = this.object;

		const activeCharacters = game.users
			.filter((user) => !user.isGM)
			.filter((user) => user.character)
			.filter((user) => (user.character.id in this.object.activityOverride ? this.object.activityOverride[user.character.id] : user.active))
			.map((user) => user.character);

		const baseExp = game.settings.get(SYSTEM, SETTINGS.metaCurrencyBaseExperience); //TODO add setting
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
			Actor.updateDocuments(activeCharacters.map((character) => ({ _id: character.id, 'system.resources.exp.value': character.system.resources.exp.value + data.totalExp })));
		}

		const newFabulaValue = game.settings.get(SYSTEM, SETTINGS.metaCurrencyKeepExcessFabula) ? spentFabulaPoints % Math.max(1, activeCharacters.length) : 0;
		game.settings.set(SYSTEM, SETTINGS.metaCurrencyFabula, newFabulaValue);
		game.settings.set(SYSTEM, SETTINGS.metaCurrencyUltima, 0);
	}

	overrideActiveCharacter(event) {
		const target = event.currentTarget;
		const actorId = target.dataset.actorId;
		const userId = target.dataset.userId;
		const user = game.users.get(userId);
		const currentOverride = this.object.activityOverride[actorId];
		this.object.activityOverride[actorId] = currentOverride ?? user.active ? 0 : 1;
		this.render();
	}

	static renderApp = () => (app ??= new MetaCurrencyTrackerApplication()).render(true);
}
