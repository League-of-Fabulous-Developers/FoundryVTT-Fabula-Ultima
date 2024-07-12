import { CheckHooks } from './check-hooks.mjs';
import { CHECK_DAMAGE, CHECK_RESULT, CHECK_ROLL } from './default-section-order.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { Flags } from '../helpers/flags.mjs';

/**
 * @typedef TargetData
 * @property {string} name
 * @property {string} uuid
 * @property {string} link
 * @property {number} difficulty
 */

function handleGenericBonus(actor, modifiers) {
	if (actor.system.bonuses.accuracy.accuracyCheck) {
		modifiers.push({
			label: 'FU.AccuracyCheckBonusGeneric',
			value: actor.system.bonuses.accuracy.accuracyCheck,
		});
	}
}

/**
 * @param {Check} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const onPrepareCheck = (check, actor, item, registerCallback) => {
	const { type, modifiers } = check;
	if (type === 'accuracy') {
		CheckConfiguration.configure(check).setTargets(
			[...game.user.targets]
				.filter((token) => !!token.actor)
				.map((token) => ({
					name: token.actor.name,
					uuid: token.actor.uuid,
					link: token.actor.link,
				})),
		);
		handleGenericBonus(actor, modifiers);
	}
};

/**
 * Hook called to process the result of the roll
 * @param {CheckResultV2} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 */
const onProcessCheck = (check, actor, item) => {
	const { type, result, critical, fumble, primary, secondary } = check;
	if (type === 'accuracy') {
		const configurer = CheckConfiguration.configure(check);
		configurer.modifyTargetedDefense((value) => value ?? 'def');
		configurer.modifyTargets((targets) => {
			if (targets?.length) {
				const targetedDefense = CheckConfiguration.inspect(check).getTargetedDefense();
				for (const target of targets) {
					target.difficulty = fromUuidSync(target.uuid).system.derived[targetedDefense].value;
					let targetResult;
					if (critical) {
						targetResult = 'hit';
					} else if (fumble) {
						targetResult = 'miss';
					} else {
						targetResult = result >= target.difficulty ? 'hit' : 'miss';
					}
					target.result = targetResult;
				}
			}
			return targets;
		});
		configurer.modifyDamage((damage) => {
			if (damage) {
				damage.modifierTotal = damage.modifiers.reduce((agg, curr) => agg + curr.value, 0);
				if (CheckConfiguration.inspect(check).getHrZero()) {
					damage.total = damage.modifierTotal;
				} else {
					damage.total = Math.max(primary.result, secondary.result) + damage.modifierTotal;
				}
			}
			return damage;
		});
	}
};

/**
 * @param {CheckRenderData} data
 * @param {CheckResultV2} checkResult
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {Object} flags
 */
function onRenderCheck(data, checkResult, actor, item, flags) {
	const { type, primary, modifierTotal, secondary, result, modifiers } = checkResult;

	if (type === 'accuracy') {
		const inspector = CheckConfiguration.inspect(checkResult);
		data.push({
			order: CHECK_ROLL,
			partial: 'systems/projectfu/templates/chat/partials/chat-accuracy-check.hbs',
			data: {
				result: {
					attr1: primary.result,
					attr2: secondary.result,
					modifier: modifierTotal,
					total: result,
				},
				check: {
					attr1: {
						attribute: primary.attribute,
					},
					attr2: {
						attribute: secondary.attribute,
					},
				},
				modifiers,
			},
		});
		const damage = inspector.getDamage();
		const hrZero = inspector.getHrZero();
		if (damage) {
			data.push({
				order: CHECK_DAMAGE,
				partial: 'systems/projectfu/templates/chat/partials/chat-damage.hbs',
				data: {
					result: {
						attr1: primary.result,
						attr2: secondary.result,
					},
					damage: {
						hrZero: hrZero,
						bonus: damage.modifierTotal,
						total: damage.total,
						type: damage.type,
					},
					translation: {
						damageTypes: FU.damageTypes,
					},
					modifiers: damage.modifiers,
				},
			});
		}

		const targets = inspector.getTargets();
		if (targets?.length) {
			data.push({
				order: CHECK_RESULT,
				partial: 'systems/projectfu/templates/chat/partials/chat-check-targets.hbs',
				data: {
					targets: targets,
				},
			});

			async function showFloatyText(target) {
				const actor = await fromUuid(target.uuid);
				if (actor instanceof FUActor) {
					actor.showFloatyText(game.i18n.localize(target.result === 'hit' ? 'FU.Hit' : 'FU.Miss'));
				}
			}

			if (game.dice3d) {
				Hooks.once('diceSoNiceRollComplete', () => {
					for (const target of targets) {
						showFloatyText(target);
					}
				});
			} else {
				for (const target of targets) {
					showFloatyText(target);
				}
			}
		}

		(flags[SYSTEM] ??= {})[Flags.ChatMessage.Item] ??= item.toObject();
	}
}

const initialize = () => {
	Hooks.on(CheckHooks.prepareCheck, onPrepareCheck);
	Hooks.on(CheckHooks.processCheck, onProcessCheck);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
};

export const AccuracyCheck = Object.freeze({
	initialize,
	configure: CheckConfiguration.configure,
	inspect: CheckConfiguration.inspect,
});
