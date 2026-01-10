import { CheckHooks } from './check-hooks.mjs';
import { CHECK_ROLL } from './default-section-order.mjs';
import { SYSTEM } from '../helpers/config.mjs';
import { CheckConfiguration } from './check-configuration.mjs';
import { Flags } from '../helpers/flags.mjs';
import { CommonSections } from './common-sections.mjs';
import { CommonEvents } from './common-events.mjs';
import { Traits } from '../pipelines/traits.mjs';
import { DamagePipeline } from '../pipelines/damage-pipeline.mjs';

const critThresholdFlag = 'critThreshold.magicCheck';

/**
 * @param {CheckV2} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const onPrepareCheck = (check, actor, item, registerCallback) => {
	const { type, modifiers } = check;
	if (type === 'magic') {
		if (actor.system.bonuses.accuracy.magicCheck) {
			modifiers.push({
				label: 'FU.MagicCheckBonusGeneric',
				value: actor.system.bonuses.accuracy.magicCheck,
			});
		}

		const flag = actor.getFlag(SYSTEM, critThresholdFlag);
		if (flag) {
			check.critThreshold = Math.min(check.critThreshold, Number(flag));
		}
	}
};

/**
 * Hook called to process the result of the roll
 * @type ProcessCheckHook
 */
const onProcessCheck = (check, actor, item, registerCallback) => {
	const { type, critical, fumble } = check;
	if (type === 'magic') {
		const config = CheckConfiguration.configure(check);
		config.setTargetedDefense('mdef');
		// TODO: Refactor alongside accuracy-checks
		if (critical) {
			config.addTraits('critical');
		} else if (fumble) {
			config.addTraits('fumble');
		}
		config.modifyDamage((damage) => {
			if (damage) {
				DamagePipeline.collectOutgoingBonuses(actor, damage);
				// TODO: Refactor this and others all the way to the end
				// Calculate the total damage
				const inspector = CheckConfiguration.inspect(check);
				if (inspector.hasTrait(Traits.Base)) {
					damage.modifiers = damage.modifiers.slice(0, 1);
				}
			}
			return damage;
		});
	}
};

/**
 * @param {CheckResultV2} checkResult
 * @param {CheckInspector} inspector
 * @param {CheckRenderData} data
 * @param {FUActor} actor
 */
function renderCombatMagicCheck(checkResult, inspector, data, actor, item, flags) {
	const targets = inspector.getTargets();
	CommonSections.actions(data, actor, item, targets, flags, inspector);
	CommonEvents.attack(inspector, actor, item);
}

/**
 * @param {CheckResultV2} checkResult
 * @param {CheckInspector} inspector
 * @param {CheckRenderData} data
 */
function renderNonCombatMagicCheck(checkResult, inspector, data) {
	data.push({
		order: CHECK_ROLL,
		partial: 'systems/projectfu/templates/chat/partials/chat-default-check.hbs',
		data: {
			result: {
				attr1: checkResult.primary.result,
				attr2: checkResult.secondary.result,
				die1: checkResult.primary.dice,
				die2: checkResult.secondary.dice,
				modifier: checkResult.modifierTotal,
				total: checkResult.result,
				crit: checkResult.critical,
				fumble: checkResult.fumble,
			},
			check: {
				attr1: {
					attribute: checkResult.primary.attribute,
				},
				attr2: {
					attribute: checkResult.secondary.attribute,
				},
				type: 'magic',
			},
			difficulty: inspector.getDifficulty(),
			modifiers: checkResult.modifiers,
		},
	});
}

/**
 * @param {CheckRenderData} data
 * @param {CheckResultV2} checkResult
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {Object} flags
 */
function onRenderCheck(data, checkResult, actor, item, flags) {
	if (checkResult.type === 'magic') {
		const inspector = CheckConfiguration.inspect(checkResult);

		if (inspector.getDifficulty()) {
			renderNonCombatMagicCheck(checkResult, inspector, data);
		} else {
			renderCombatMagicCheck(checkResult, inspector, data, actor, item, flags);
		}

		(flags[SYSTEM] ??= {})[Flags.ChatMessage.Item] ??= item.toObject();
	}
}

const initialize = () => {
	Hooks.on(CheckHooks.prepareCheck, onPrepareCheck);
	Hooks.on(CheckHooks.processCheck, onProcessCheck);
	Hooks.on(CheckHooks.renderCheck, onRenderCheck);
};

export const MagicCheck = Object.freeze({
	initialize,
});
