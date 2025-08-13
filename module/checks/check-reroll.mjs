import { SYSTEM } from '../helpers/config.mjs';
import { Flags } from '../helpers/flags.mjs';
import { Checks } from './checks.mjs';
import { CHECK_REROLL } from './default-section-order.mjs';
import { CheckHooks } from './check-hooks.mjs';
import { CheckConfiguration } from './check-configuration.mjs';

const { Die, DiceTerm, NumericTerm } = foundry.dice.terms;

/**
 * @typedef RerollParams
 * @property {"identity" | "theme" | "origin" | "trait"} trait
 * @property {string} value
 * @property {("attr1"| "attr2")[] } selection
 * @property {boolean} ignoreFp
 */

function addRerollEntry(application, menuItems) {
	// Character push
	menuItems.unshift({
		name: 'FU.ChatContextRerollFabula',
		icon: '<i class="fas fa-dice"></i>',
		group: SYSTEM,
		condition: (li) => {
			const messageId = li.dataset.messageId;
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			const flag = message?.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
			const speakerActor = ChatMessage.getSpeakerActor(message?.speaker);
			return message && message.isRoll && flag && speakerActor?.type === 'character' && !flag.fumble && speakerActor.system.resources.fp.value;
		},
		callback: async (li) => {
			const messageId = li.dataset.messageId;
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			if (message) {
				const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
				if (check) {
					await Checks.modifyCheck(check.id, handleReroll);
				}
			}
		},
	});

	// Villain reroll
	menuItems.unshift({
		name: 'FU.ChatContextRerollUltima',
		icon: '<i class="fas fa-dice"></i>',
		group: SYSTEM,
		condition: (li) => {
			const messageId = li.dataset.messageId;
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			const flag = message?.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
			const speakerActor = ChatMessage.getSpeakerActor(message?.speaker);
			return message && message.isRoll && flag && speakerActor?.type === 'npc' && speakerActor.system.villain.value && !flag.fumble && speakerActor.system.resources.fp.value;
		},
		callback: async (li) => {
			const messageId = li.dataset.messageId;
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			if (message) {
				const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
				if (check) {
					await Checks.modifyCheck(check.id, handleReroll);
				}
			}
		},
	});
}

/** @type RenderCheckHook */
const onRenderCheck = async (data, checkResult, actor, item, additionalFlags) => {
	const rerollData = checkResult.additionalData.reroll;
	if (rerollData) {
		data.push({
			order: CHECK_REROLL,
			partial: 'systems/projectfu/templates/chat/partials/chat-check-reroll.hbs',
			data: rerollData,
		});
	}
};
/**
 *
 * @param {CheckResultV2} check
 * @param {FUActor} actor
 * @returns {Promise<RerollParams | undefined>}
 */
const getRerollParams = async (check, actor) => {
	const traits = [];
	if (actor.type === 'character') {
		const {
			identity: { name: identity },
			theme: { name: theme },
			origin: { name: origin },
		} = actor.system.resources;
		traits.push({ type: 'identity', value: identity });
		traits.push({ type: 'theme', value: theme });
		traits.push({ type: 'origin', value: origin });
	}
	if (actor.type === 'npc') {
		actor.system.traits.value
			.split(',')
			.map((trait) => ({
				type: 'trait',
				value: trait,
			}))
			.forEach((trait) => traits.push(trait));
	}

	const attr1 = {
		attribute: check.primary.attribute,
		result: check.primary.result,
	};

	const attr2 = {
		attribute: check.secondary.attribute,
		result: check.secondary.result,
	};

	/** @type RerollParams */
	const reroll = await foundry.applications.api.DialogV2.prompt({
		window: { title: game.i18n.localize('FU.DialogRerollTitle') },
		label: game.i18n.localize('FU.DialogRerollLabel'),
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-check-reroll.hbs', {
			traits,
			attr1,
			attr2,
		}),
		classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
		/** @type {(jQuery) => RerollParams} */
		ok: {
			callback: (event, button, dialog) => {
				const trait = dialog.element.querySelector('input[name=trait]:checked');

				const selection = dialog.element
					.querySelectorAll('input[name=results]:checked')
					.values()
					.map((el) => el.value)
					.toArray();

				const ignoreFp = dialog.element.querySelector('input[name="ignore-fp"]').checked;

				return {
					trait: trait.value,
					value: trait.dataset.value,
					selection: selection,
					ignoreFp: ignoreFp,
				};
			},
		},
		rejectClose: false,
	});

	if (reroll) {
		if (!reroll.trait) {
			ui.notifications.error('FU.DialogRerollMissingTrait', { localize: true });
			return;
		}

		if (!reroll.selection || !reroll.selection.length) {
			ui.notifications.error('FU.DialogRerollMissingDice', { localize: true });
			return;
		}

		return reroll;
	}
};

/**
 * @param {boolean} reroll
 * @param {RollTerm} term
 * @return {RollTerm} the replacement
 */
function getReplacementTerm(reroll, term) {
	if (reroll) {
		if (term instanceof DiceTerm) {
			return new Die({ faces: term.faces, options: term.options });
		} else if (term instanceof NumericTerm) {
			return new Die({ faces: term.options.faces, options: term.options });
		} else {
			throw new Error('Unexpected term');
		}
	} else {
		if (term instanceof DiceTerm) {
			return new NumericTerm({ number: term.total, options: { ...term.options, faces: term.faces } });
		} else if (term instanceof NumericTerm) {
			return new NumericTerm({ number: term.number, options: term.options });
		} else {
			throw new Error('Unexpected term');
		}
	}
}

/**
 * @type CheckModificationCallback
 */
const handleReroll = async (result, actor, item) => {
	const reroll = await getRerollParams(result, actor);
	if (reroll) {
		result.additionalData.reroll = { reroll };
		const oldRoll = result.roll instanceof Roll ? result.roll : Roll.fromData(result.roll);
		const oldTerms = oldRoll.terms;
		const roll = oldRoll.clone();
		roll.terms[0] = getReplacementTerm(reroll.selection.includes('attr1'), oldTerms[0]);
		roll.terms[2] = getReplacementTerm(reroll.selection.includes('attr2'), oldTerms[2]);

		if (!reroll.ignoreFp) {
			CheckConfiguration.registerMetaCurrencyExpenditure(result, actor);
		}

		return { roll };
	} else {
		return false;
	}
};

function initialize() {
	Hooks.on('getChatMessageContextOptions', addRerollEntry);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
}

export const CheckReroll = Object.freeze({
	initialize,
});
