import { SYSTEM } from '../helpers/config.mjs';
import { Flags } from '../helpers/flags.mjs';
import { Checks } from './checks.mjs';
import { CHECK_PUSH } from './default-section-order.mjs';
import { CheckHooks } from './check-hooks.mjs';
import { CheckConfiguration } from './check-configuration.mjs';

const { DiceTerm, OperatorTerm, NumericTerm } = foundry.dice.terms;

function addRollContextMenuEntries(application, menuItems) {
	// Character push
	menuItems.unshift({
		name: 'FU.ChatContextPush',
		icon: '<i class="fas fa-arrow-up-right-dots"></i>',
		group: SYSTEM,
		condition: (li) => {
			const messageId = li.dataset.messageId;
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			const flag = message?.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
			const speakerActor = ChatMessage.getSpeakerActor(message?.speaker);
			return message && message.isRoll && flag && speakerActor?.type === 'character' && !flag.additionalData.push && !flag.fumble && speakerActor.system.resources.fp.value;
		},
		callback: async (li) => {
			const messageId = li.dataset.messageId;
			/** @type ChatMessage | undefined */
			const message = game.messages.get(messageId);
			if (message) {
				const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
				if (check) {
					await Checks.modifyCheck(check.id, handlePush);
				}
			}
		},
	});
}

/**
 * @type RenderCheckHook
 */
const onRenderCheck = async (data, checkResult, actor, item, additionalFlags) => {
	const pushData = checkResult.additionalData.push;
	if (pushData) {
		data.push({
			order: CHECK_PUSH,
			partial: 'systems/projectfu/templates/chat/partials/chat-check-push.hbs',
			data: { push: pushData },
		});
	}
};

const getPushParams = async (actor) => {
	/** @type CheckPush[] */
	const bonds = actor.system.bonds.map((value) => {
		const feelings = [];
		value.admInf.length && feelings.push(value.admInf);
		value.loyMis.length && feelings.push(value.loyMis);
		value.affHat.length && feelings.push(value.affHat);

		return {
			with: value.name,
			feelings: feelings,
			strength: value.strength,
		};
	});

	/** @type CheckPush */
	const push = await foundry.applications.api.DialogV2.prompt({
		window: { title: game.i18n.localize('FU.DialogPushTitle') },
		label: game.i18n.localize('FU.DialogPushLabel'),
		content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-check-push.hbs', { bonds }),
		classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
		/** @type {(jQuery) => (CheckPush | false)} */
		ok: {
			callback: (event, html, dialog) => {
				const index = Number(dialog.element.querySelector('input[name=bond]:checked').value);
				return bonds[index] || false;
			},
		},
		rejectClose: false,
	});

	if (push === false) {
		ui.notifications.error('FU.DialogPushMissingBond', { localize: true });
		return;
	}

	return push;
};

/**
 * @param {RollTerm} term
 * @return {RollTerm} the replacement
 */
function getReplacementTerm(term) {
	if (term instanceof DiceTerm) {
		return new NumericTerm({ number: term.total, options: { ...term.options, faces: term.faces } });
	} else if (term instanceof NumericTerm) {
		return new NumericTerm({ number: term.number, options: term.options });
	} else {
		throw new Error(`Unexpected term: ${term.constructor.name}`);
	}
}

/**
 * @type CheckModificationCallback
 */
const handlePush = async (check, actor, item) => {
	const pushParams = await getPushParams(actor);
	if (pushParams) {
		check.additionalData.push = pushParams;
		check.modifiers = check.modifiers.filter((value) => value.label !== 'FU.CheckPushModifier');
		check.modifiers.push({
			label: 'FU.CheckPushModifier',
			value: pushParams.strength,
		});
		const modifierTotal = check.modifiers.reduce((agg, curr) => agg + curr.value, 0);
		const roll = check.roll instanceof Roll ? check.roll : Roll.fromData(check.roll);
		const terms = [];
		terms.push(getReplacementTerm(roll.terms[0]));
		terms.push(new OperatorTerm({ operator: '+' }));
		terms.push(getReplacementTerm(roll.terms[2]));

		if (modifierTotal < 0) {
			terms.push(new OperatorTerm({ operator: '-' }));
		} else {
			terms.push(new OperatorTerm({ operator: '+' }));
		}
		terms.push(new NumericTerm({ number: modifierTotal }));

		CheckConfiguration.registerMetaCurrencyExpenditure(check, actor);

		return { roll: Roll.fromTerms(terms) };
	} else {
		return false;
	}
};

function initialize() {
	Hooks.on('getChatMessageContextOptions', addRollContextMenuEntries);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
}

export const CheckPush = Object.freeze({
	initialize,
});
