import { SYSTEM } from '../helpers/config.mjs';
import { Flags } from '../helpers/flags.mjs';
import { ChecksV2 } from './checks-v2.mjs';
import { CHECK_REROLL } from './default-section-order.mjs';
import { CheckHooks } from './check-hooks.mjs';

/**
 * @typedef RerollParams
 * @property {"identity" | "theme" | "origin" | "trait"} trait
 * @property {string} value
 * @property {("attr1"| "attr2")[] } selection
 */

function addRerollEntry(html, options) {
	// Character push
	options.unshift({
		name: 'FU.ChatContextRerollFabula',
		icon: '<i class="fas fa-dice"></i>',
		group: SYSTEM,
		condition: (li) => {
			const messageId = li.data('messageId');
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			const flag = message?.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
			const speakerActor = ChatMessage.getSpeakerActor(message?.speaker);
			return message && message.isRoll && flag && speakerActor?.type === 'character' && !flag.fumble;
		},
		callback: async (li) => {
			const messageId = li.data('messageId');
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			if (message) {
				const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
				if (check) {
					await ChecksV2.modifyCheck(check.id, handleReroll);
				}
			}
		},
	});

	// Villain reroll
	options.unshift({
		name: 'FU.ChatContextRerollUltima',
		icon: '<i class="fas fa-dice"></i>',
		group: SYSTEM,
		condition: (li) => {
			const messageId = li.data('messageId');
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			const flag = message?.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
			const speakerActor = ChatMessage.getSpeakerActor(message?.speaker);
			return message && message.isRoll && flag && speakerActor?.type === 'npc' && speakerActor.system.villain.value && !flag.fumble;
		},
		callback: async (li) => {
			const messageId = li.data('messageId');
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			if (message) {
				const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
				if (check) {
					await ChecksV2.modifyCheck(check.id, handleReroll);
				}
			}
		},
	});
}

const onRenderCheck = async (data, checkResult, actor, item) => {
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
	const reroll = await Dialog.prompt({
		title: game.i18n.localize('FU.DialogRerollTitle'),
		label: game.i18n.localize('FU.DialogRerollLabel'),
		content: await renderTemplate('systems/projectfu/templates/dialog/dialog-check-reroll.hbs', {
			traits,
			attr1,
			attr2,
		}),
		options: { classes: ['dialog-reroll', 'unique-dialog', 'backgroundstyle'] },
		/** @type {(jQuery) => RerollParams} */
		callback: (html) => {
			const trait = html.find('input[name=trait]:checked');

			let selection = html
				.find('input[name=results]:checked')
				.map((_, el) => el.value)
				.get();

			selection = Array.isArray(selection) ? selection : [selection];

			return {
				trait: trait.val(),
				value: trait.data('value'),
				selection: selection,
			};
		},
	});

	if (!reroll.trait) {
		ui.notifications.error('FU.DialogRerollMissingTrait', { localize: true });
		return;
	}

	if (!reroll.selection || !reroll.selection.length) {
		ui.notifications.error('FU.DialogRerollMissingDice', { localize: true });
		return;
	}

	return reroll;
};

/**
 * @param {boolean} reroll
 * @param {RollTerm} term
 * @return {RollTerm} the replacement
 */
function getReplacementTerm(reroll, term) {
	const DiceTermClass = foundry.utils.isNewerVersion(game.version, '12.0.0') ? foundry.dice.terms.DiceTerm : DiceTerm;

	const NumericTermClass = foundry.utils.isNewerVersion(game.version, '12.0.0') ? foundry.dice.terms.NumericTerm : NumericTerm;

	const DieClass = foundry.utils.isNewerVersion(game.version, '12.0.0') ? foundry.dice.terms.Die : Die;

	if (reroll) {
		if (term instanceof DiceTermClass) {
			return new DieClass({ faces: term.faces, options: term.options });
		} else if (term instanceof NumericTermClass) {
			return new DieClass({ faces: term.options.faces, options: term.options });
		} else {
			throw new Error('Unexpected term');
		}
	} else {
		if (term instanceof DiceTermClass) {
			return new NumericTermClass({ number: term.total, options: { ...term.options, faces: term.faces } });
		} else if (term instanceof NumericTermClass) {
			return new NumericTermClass({ number: term.number, options: term.options });
		} else {
			throw new Error('Unexpected term');
		}
	}
}

/**
 * @param {CheckResultV2} result
 * @param {FUActor} actor
 * @param {FUItem} item
 * @return {Promise<{[roll]: Roll,[check]: Check }>}
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
		return { roll };
	} else {
		return null;
	}
};

function initialize() {
	Hooks.on('getChatLogEntryContext', addRerollEntry);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
}

export const CheckReroll = Object.freeze({
	initialize,
});
