import { FUHooks } from '../hooks.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { Pipeline, PipelineRequest } from './pipeline.mjs';
import { Flags } from '../helpers/flags.mjs';
import { ChecksV2 } from '../checks/checks-v2.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';
import { DamageCustomizer } from './damage-customizer.mjs';
import { getSelected, getTargeted } from '../helpers/target-handler.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';

/**
 * @typedef ApplyTargetOverrides
 * @prop {number | null} affinity
 * @prop {number | null} total
 */

/**
 * @property {BaseDamageInfo} baseDamageInfo
 * @property {ExtraDamageInfo} extraDamageInfo
 * @property {ApplyTargetOverrides} overrides
 * @extends PipelineRequest
 */
export class DamageRequest extends PipelineRequest {
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
	get amount() {
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
 * @callback DamageModifier
 * @param {number} baseDamage
 * @param {ClickModifiers} modifiers
 * @return {number}
 */

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
		const damageTaken = request.overrides?.total || -damageMod(request.amount, request.clickModifiers);

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

/**
 * @param {?} message
 * @param {jQuery} jQuery
 */
function onRenderChatMessage(message, jQuery) {
	const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckParams);
	let sourceUuid = null;
	let sourceName;
	let baseDamageInfo;
	let disabled = false;

	if (check && check.damage) {
		sourceName = check.details.name;
		baseDamageInfo = {
			total: check.damage.total,
			type: check.damage.type,
			modifierTotal: check.damage.modifierTotal,
		};
	}

	if (ChecksV2.isCheck(message)) {
		const damage = CheckConfiguration.inspect(message).getDamage();
		if (damage) {
			sourceUuid = message.getFlag(SYSTEM, Flags.ChatMessage.CheckV2)?.itemUuid;
			sourceName = message.getFlag(SYSTEM, Flags.ChatMessage.Item)?.name;
			baseDamageInfo = {
				total: damage.total,
				type: damage.type,
				modifierTotal: damage.modifierTotal,
			};
		}
	}

	const handleClick = async (event, getTargetsFunction) => {
		event.preventDefault();
		if (!disabled) {
			disabled = true;
			const targets = await getTargetsFunction(event);
			if (event.ctrlKey || event.metaKey) {
				DamageCustomizer(
					baseDamageInfo,
					targets,
					(extraDamageInfo) => {
						handleDamageApplication(event, targets, sourceUuid, sourceName, baseDamageInfo, extraDamageInfo);
						disabled = false;
					},
					() => {
						disabled = false;
					},
				);
			} else {
				handleDamageApplication(event, targets, sourceUuid, sourceName, baseDamageInfo, {});
				disabled = false;
			}
		}
	};

	jQuery.find(`a[data-action=applySingleDamage]`).click((event) => handleClick(event, Pipeline.getSingleTarget));
	jQuery.find(`a[data-action=applySelectedDamage]`).click((event) => handleClick(event, getSelected));
	jQuery.find(`a[data-action=applyTargetedDamage]`).click((event) => handleClick(event, getTargeted));
	jQuery.find(`a[data-action=selectDamageCustomizer]`).click(async (event) => {
		if (!disabled) {
			disabled = true;
			const targets = await getTargeted(event);
			DamageCustomizer(
				baseDamageInfo,
				targets,
				(extraDamageInfo) => {
					handleDamageApplication(event, targets, sourceUuid, sourceName, baseDamageInfo, extraDamageInfo);
					disabled = false;
				},
				() => {
					disabled = false;
				},
			);
		}
	});
}

/**
 *
 * @param {Event} event
 * @param {FUActor[]} targets
 * @param {string} sourceUuid
 * @param {string} sourceName
 * @param {import('../helpers/typedefs.mjs').BaseDamageInfo} baseDamageInfo
 * @param {import('./damage-customizer.mjs').ExtraDamageInfo} extraDamageInfo
 * @returns {void}
 */
async function handleDamageApplication(event, targets, sourceUuid, sourceName, baseDamageInfo, extraDamageInfo) {
	const sourceInfo = new InlineSourceInfo(sourceName, sourceUuid, null);
	const request = new DamageRequest(sourceInfo, targets, baseDamageInfo, extraDamageInfo);
	request.setEvent(event);
	await DamagePipeline.process(request);
}

export const DamagePipeline = {
	process,
	onRenderChatMessage,
};
