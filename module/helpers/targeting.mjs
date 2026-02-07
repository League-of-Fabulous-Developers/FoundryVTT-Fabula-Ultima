import { ChooseWeaponDialog } from '../documents/items/skill/choose-weapon-dialog.mjs';
import { Flags } from './flags.mjs';
import { getTargeted } from './target-handler.mjs';
import { ChatAction } from './chat-action.mjs';

/**
 * @typedef {"self", "single", "multiple", "weapon", "special"} TargetingRule
 */

/**
 * @typedef DefenseData
 * @property {Number} def
 * @property {Number} mdef
 * @property {Number} dex
 * @property {Number} ins
 * @property {Number} mig
 * @property {Number} wlp
 */

/**
 * @typedef TargetData
 * @property {string} name The name of the actor
 * @property {string} uuid The uuid of the actor
 * @property {string} link An html link to the actor
 * @property {Number} def
 * @property {Number} mdef
 * @property {DefenseData} defenses
 * @property {number} difficulty
 * @property {"none", "hit", "miss"} result
 * @property {Boolean} isOwner
 */

// TODO: Make an option for GM
/**
 * @type {boolean}
 */
const STRICT_TARGETING = false;

/**
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {FUActor[] | Token[] | TargetData[]} targets
 * @returns {FUActor[]|FUItem}
 */
async function filterTargetsByRule(actor, item, targets) {
	if (!item.system.targeting) {
		throw Error(`"No targeting data model in the given item ${item.name}`);
	}

	/**
	 * @type {TargetingDataModel}
	 */
	const targeting = item.system.targeting;

	switch (targeting.rule) {
		case 'self':
			return [];
		case 'single':
			if (targets.length === 0) {
				return [];
			} else if (targets.length > 1) {
				ui.notifications.warn('FU.ChatApplyMaxTargetWarning', { localize: true });
				return [];
			}
			return [targets[0]];
		case 'multiple':
			if (targets.length === 0) {
				return [];
			} else if (targets.length > targeting.max.value) {
				ui.notifications.warn('FU.ChatApplyMaxTargetWarning', { localize: true });
				return [];
			}
			return targets;
		case 'weapon': {
			const weapon = await ChooseWeaponDialog.prompt(actor);
			return [weapon];
		}
		case 'special':
			return targets;
	}
}

/**
 * @type {ChatAction}
 * @description Target the token
 */
const defaultAction = new ChatAction('targetSingle', 'fas fa-bullseye', 'FU.ChatPingTarget');

/**
 * @returns {TargetData[]}
 */
function getSerializedTargetData() {
	const targets = getTargeted(false, false);
	return serializeTargetData(targets);
}

/**
 * @param {FUActor[]} targets
 * @return {TargetData[]}
 */
function serializeTargetData(targets) {
	return targets.map((target) => {
		return constructData(target);
	});
}

/**
 * @param {FUActor} actor
 * @returns {TargetData}
 */
function constructData(actor) {
	/** @type TargetData **/
	return {
		name: actor.name,
		uuid: actor.uuid,
		link: actor.link,
		result: 'none', // Updated during evaluation
		// LEGACY
		def: actor.system.derived.def.value,
		mdef: actor.system.derived.mdef.value,
		defenses: {
			def: actor.system.derived.def.value,
			mdef: actor.system.derived.mdef.value,
			dex: actor.system.attributes.dex.current,
			ins: actor.system.attributes.ins.current,
			mig: actor.system.attributes.mig.current,
			wlp: actor.system.attributes.wlp.current,
		},
		isOwner: actor.isOwner,
	};
}

/**
 * @param {TargetData[]} targetData
 * @return {FUActor[]}
 */
function deserializeTargetData(targetData) {
	const targets = targetData.map((t) => fromUuidSync(t.uuid));
	return targets;
}

/**
 * @param {Document} document
 * @param {HTMLElement} html
 */
function onRenderChatMessage(document, html) {
	if (!document.getFlag(Flags.Scope, Flags.ChatMessage.Targets)) {
		return;
	}

	const links = html.querySelectorAll(`a[data-action="${defaultAction.name}"]`);
	links.forEach((link) => {
		link.addEventListener('click', function (event) {
			console.debug(`Targeting ${this.dataset.id}`);
			const actor = fromUuidSync(this.dataset.id);
			const token = actor.token?.object;
			if (!validateCombatant(token)) return;
			return pingCombatant(token);
		});
	});
}

Hooks.on(`renderChatMessageHTML`, onRenderChatMessage);

function validateCombatant(token) {
	const canvas = game.canvas;
	if (!canvas.ready || token.scene.id !== canvas.scene.id) {
		return false;
	}
	if (!token.visible) {
		return ui.notifications.warn(game.i18n.localize('COMBAT.WarnNonVisibleToken'));
	}
	return true;
}

async function pingCombatant(token) {
	const canvas = game.canvas;
	await canvas.ping(token.center);
	await panToCombatant(token);
}

async function panToCombatant(token) {
	const canvas = game.canvas;
	const { x, y } = token.center;
	await canvas.animatePan({ x, y, scale: Math.max(canvas.stage.scale.x, 0.5) });
}

export const Targeting = Object.freeze({
	rule: {
		self: 'self',
		single: 'single',
		multiple: 'multiple',
		weapon: 'weapon',
		special: 'special',
	},
	filterTargetsByRule,
	getSerializedTargetData,
	serializeTargetData,
	deserializeTargetData,
	onRenderChatMessage,
	constructData,
	STRICT_TARGETING,
	defaultAction,
});
