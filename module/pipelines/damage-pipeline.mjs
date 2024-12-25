import { FUHooks } from '../hooks.mjs';
import { FU } from '../helpers/config.mjs';

/**
 * @property {FUActor[]} targets
 * @property {InlineSourceInfo} sourceInfo
 * @property {Event | null} event
 * @property {ClickModifiers | null} clickModifiers
 * @property {String} chatTemplateName The name of the template used for rendering the request
 */
class ResourceRequest {
	constructor(sourceInfo, targets) {
		this.sourceInfo = sourceInfo;
		this.targets = targets;
	}

	setEvent(event) {
		this.event = event;
		this.clickModifiers = {
			alt: event.altKey,
			ctrl: event.ctrlKey || event.metaKey,
			shift: event.shiftKey,
		};
	}

	setTemplate(template) {
		this.chatTemplateName = template;
	}
}

/**
 * @property {BaseDamageInfo} baseDamageInfo
 * @property {ExtraDamageInfo} extraDamageInfo
 * @property {ApplyTargetOverrides} overrides
 * @extends ResourceRequest
 */
export class DamageRequest extends ResourceRequest {
	constructor(sourceInfo, targets, baseDamageInfo, extraDamageInfo = null) {
		super(sourceInfo, targets);
		this.baseDamageInfo = baseDamageInfo;
		this.extraDamageInfo = extraDamageInfo || {};
		this.overrides = {};
		this.setTemplate('systems/projectfu/templates/chat/chat-apply-damage.hbs');
	}

	/**
	 * @returns {Number}
	 */
	get total() {
		return this.extraDamageInfo.hrZero
			? this.extraDamageInfo.damageBonus + this.baseDamageInfo.modifierTotal + (this.extraDamageInfo.extraDamage || 0)
			: this.baseDamageInfo.total + (this.extraDamageInfo.damageBonus || 0) + (this.extraDamageInfo.extraDamage || 0);
	}

	/**
	 * @returns {*|"untyped"|"physical"|"air"|"bolt"|"dark"|"earth"|"fire"|"ice"|"light"|"poison"}
	 */
	get damageType() {
		return this.extraDamageInfo.damageType || this.baseDamageInfo.type;
	}

	/**
	 * @returns {FUActor[]}
	 */
	get allTargets() {
		return this.extraDamageInfo.targets || this.targets;
	}

	/**
	 * @returns {boolean} Whether the request is in a valid state
	 */
	validate() {
		if (!this.allTargets) {
			console.error(`No targets assigned to request`);
			return;
		}

		if (!Array.isArray(this.targets)) {
			console.error('Targets is not an array:', this.targets);
			return false;
		}

		return true;
	}
}

/**
 * @type {Record<number, DamageModifier>}
 */
const affinityDamageModifier = {
	[FU.affValue.vulnerability]: (damage) => damage * 2,
	[FU.affValue.none]: (damage) => damage,
	[FU.affValue.resistance]: (damage, { shift }) => (shift ? damage : Math.floor(damage / 2)),
	[FU.affValue.immunity]: (damage, { shift, ctrl }) => (shift && ctrl ? damage : 0),
	[FU.affValue.absorption]: (damage) => -damage,
};

const affinityKeys = {
	[FU.affValue.vulnerability]: () => 'FU.ChatApplyDamageVulnerable',
	[FU.affValue.none]: () => 'FU.ChatApplyDamageNormal',
	[FU.affValue.resistance]: ({ shift }) => (shift ? 'FU.ChatApplyDamageResistantIgnored' : 'FU.ChatApplyDamageResistant'),
	[FU.affValue.immunity]: ({ shift, ctrl }) => (shift && ctrl ? 'FU.ChatApplyDamageImmuneIgnored' : 'FU.ChatApplyDamageImmune'),
	[FU.affValue.absorption]: () => 'FU.ChatApplyDamageAbsorb',
};

/**
 * @param {DamageRequest} request
 * @return {Promise<Awaited<unknown>[]>}
 */
async function applyDamageInternal(request) {
	if (!request.validate()) {
		return;
	}

	const updates = [];
	for (const actor of request.targets) {
		Hooks.callAll(FUHooks.DAMAGE_APPLY_TARGET, request);

		let affinity = FU.affValue.none; // Default to no affinity
		let affinityIcon = '';
		let affinityString = '';
		if (request.overrides?.affinity) {
			affinity = request.overrides.affinity;
			affinityIcon = FU.affIcon[request.damageType];
		} else if (request.damageType in actor.system.affinities) {
			affinity = actor.system.affinities[request.damageType].current;
			affinityIcon = FU.affIcon[request.damageType];
		}
		affinityString = await renderTemplate('systems/projectfu/templates/chat/partials/inline-damage-icon.hbs', {
			damageType: game.i18n.localize(FU.damageTypes[request.damageType]),
			affinityIcon: affinityIcon,
		});

		// Check if affinity should be ignored
		if (affinity === FU.affValue.vulnerability && request.extraDamageInfo.ignoreVulnerable) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.resistance && request.extraDamageInfo.ignoreResistance) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.immunity && request.extraDamageInfo.ignoreImmunities) {
			affinity = FU.affValue.none;
		}
		if (affinity === FU.affValue.absorption && request.extraDamageInfo.ignoreAbsorption) {
			affinity = FU.affValue.none;
		}

		const damageMod = affinityDamageModifier[affinity] ?? affinityDamageModifier[FU.affValue.none];
		const damageTaken = request.overrides?.total || -damageMod(request.total, request.clickModifiers);

		updates.push(actor.modifyTokenAttribute('resources.hp', damageTaken, true));
		updates.push(
			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				flavor: game.i18n.localize(FU.affType[affinity]),
				content: await renderTemplate(request.chatTemplateName, {
					message: affinityKeys[affinity](request.clickModifiers),
					actor: actor.name,
					damage: Math.abs(damageTaken),
					type: affinityString,
					from: request.sourceInfo.name,
				}),
			}),
		);
	}
	return Promise.all(updates);
}

/**
 * @param {DamageRequest} request
 * @return {Promise<Awaited<unknown>[]>}
 */
async function process(request) {
	Hooks.callAll(FUHooks.DAMAGE_APPLY_BEFORE, request);
	await applyDamageInternal(request);
}

export const DamagePipeline = {
	process,
};
