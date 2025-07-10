import { Flags } from '../helpers/flags.mjs';
import { SYSTEM } from '../helpers/config.mjs';
import { Checks } from './checks.mjs';
import { CheckHooks } from './check-hooks.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { CHECK_ROLL } from './default-section-order.mjs';

const supportCheckKey = 'supportCheck';

/**
 * @param {GroupCheckV2Flag} groupCheck
 * @return {Promise<void>}
 */
async function handleSupportCheck(groupCheck) {
	const character = canvas.tokens.controlled.at(0)?.document.actor || game.user.character;
	if (!character) {
		ui.notifications.error('FU.GroupCheckMissingCharacter', { localize: true });
		return;
	}
	if (character.type !== 'character') {
		ui.notifications.error('FU.GroupCheckNotPlayerCharacter', { localize: true });
		return;
	}
	if (character.id === groupCheck.leader) {
		ui.notifications.error('FU.GroupCheckLeaderCantSupport', { localize: true });
		return;
	}
	if (groupCheck.supporters.find((supporter) => supporter.id === character.id)) {
		ui.notifications.error('FU.GroupCheckAlreadySupported', { localize: true });
		return;
	}

	const bonds = (character.system.bonds ?? [])
		.map((bond) => {
			const feelings = [];
			bond.admInf.length && feelings.push(bond.admInf);
			bond.loyMis.length && feelings.push(bond.loyMis);
			bond.affHat.length && feelings.push(bond.affHat);
			return { name: bond.name, feelings };
		})
		.filter((value) => value.feelings.length);

	let bond;
	try {
		bond = await foundry.applications.api.DialogV2.prompt({
			window: { title: game.i18n.localize('FU.GroupCheckBondDialogTitle') },
			label: game.i18n.localize('FU.GroupCheckBondDialogLabel'),
			options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/dialog/dialog-group-check-support-bond.hbs', {
				leader: game.actors.get(groupCheck.leader).name,
				bonds,
			}),
			ok: {
				callback: (event, button, dialog) => {
					const selected = dialog.element.querySelector('[name=bond]:checked').value;
					return bonds[selected]?.feelings ?? [];
				},
			},
		});
	} catch (e) {
		const msg = game.i18n.localize('FU.GroupCheckSupportCanceled');
		ui.notifications.info(msg);
		throw new Error(msg);
	}

	return Checks.supportCheck(character, (check, actor) => {
		check.primary = groupCheck.primary;
		check.secondary = groupCheck.secondary;
		if (groupCheck.initiative && actor.system.derived.init.value) {
			check.modifiers.push({
				label: 'FU.InitiativeBonus',
				value: actor.system.derived.init.value,
			});
		}
		check.additionalData[supportCheckKey] = {
			groupCheck: groupCheck.id,
			bond: bond,
		};
		CheckConfiguration.configure(check).setDifficulty(groupCheck.supportDifficulty || 10);
	});
}

/**
 * @param {ChatLog} chatLog
 * @param {Document} html
 */
function attachSupportCheckListener(chatLog, html) {
	// Reapply event listeners for each chat message
	html.addEventListener('click', async (event) => {
		const groupCheckId = event.target.dataset.support;
		if (groupCheckId) {
			const messageId = event.target.closest('[data-message-id]')?.dataset?.messageId;
			const message = game.messages.get(messageId);
			if (message) {
				const groupCheck = message.getFlag(SYSTEM, Flags.ChatMessage.GroupCheckV2);
				if (groupCheck && groupCheck.status === 'open') {
					event.target.disabled = true;
					try {
						await handleSupportCheck(groupCheck);
					} finally {
						event.target.disabled = false;
					}
				}
			}
		}
	});
}

/**
 * @type {RenderCheckHook}
 */
const onRenderSupportCheck = (sections, check, actor) => {
	const { type, primary, modifierTotal, secondary, result, critical, fumble } = check;
	if (type === 'support') {
		const inspector = CheckConfiguration.inspect(check);
		sections.push({
			order: CHECK_ROLL,
			partial: 'systems/projectfu/templates/chat/partials/chat-default-check.hbs',
			data: {
				result: {
					attr1: primary.result,
					attr2: secondary.result,
					die1: primary.dice,
					die2: secondary.dice,
					modifier: modifierTotal,
					total: result,
					crit: critical,
					fumble: fumble,
				},
				check: {
					attr1: {
						attribute: primary.attribute,
					},
					attr2: {
						attribute: secondary.attribute,
					},
				},
				difficulty: inspector.getDifficulty(),
				modifiers: check.modifiers,
			},
		});
	}
};

/**
 * @param {CheckId} groupCheckId
 * @param {CheckResultV2} checkData
 */
const isSupporting = (groupCheckId, checkData) => {
	return checkData.additionalData[supportCheckKey].groupCheck === groupCheckId;
};

/**
 * @param {CheckResultV2} check
 * @return {("Admiration"|"Inferiority"|"Loyalty"|"Mistrust"|"Affection"|"Hatred")[]}
 */
const getBond = (check) => {
	return check.additionalData[supportCheckKey].bond ?? [];
};

const initialize = () => {
	Hooks.on('renderChatLog', attachSupportCheckListener);
	Hooks.on(CheckHooks.renderCheck, onRenderSupportCheck);
};

export const SupportCheck = Object.freeze({
	initialize,
	isSupporting,
	getBond,
});
