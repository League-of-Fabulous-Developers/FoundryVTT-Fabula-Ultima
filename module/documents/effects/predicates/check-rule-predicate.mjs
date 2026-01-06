import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';
import { FUHooks as FUhooks, FUHooks } from '../../../hooks.mjs';
import { ItemAttributesDataModel } from '../../items/common/item-attributes-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUCheckParity} parity
 * @property {FUCheckOutcome} outcome
 * @property {ItemAttributesDataModel} attributes
 * @property {Number} result A specific result of the check.
 */
export class CheckRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'checkRulePredicate' });
	}

	static get metadata() {
		return {
			...super.metadata,
			eventTypes: [FUHooks.RENDER_CHECK_EVENT, FUHooks.RESOLVE_CHECK_EVENT, FUHooks.ATTACK_EVENT],
		};
	}

	// TODO: Finish porting..
	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			parity: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.checkParity) }),
			outcome: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.checkOutcome) }),
			attributes: new fields.EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: '' }, secondary: { value: '' } } }),
			result: new fields.NumberField({ integer: true }),
		});
	}

	static get localization() {
		return 'FU.RulePredicateCheck';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/check-rule-predicate');
	}

	/**
	 * @override
	 */
	validateContext(context) {
		/** @type {CheckV2|CheckResultV2} **/
		let check;
		switch (context.type) {
			case FUhooks.RENDER_CHECK_EVENT:
			case FUHooks.RESOLVE_CHECK_EVENT: {
				/** @type {ResolveCheckEvent|RenderCheckEvent} **/
				const rce = context.event;
				check = rce.check;
				break;
			}

			case FUHooks.ATTACK_EVENT: {
				/** @type AttackEvent **/
				const ae = context.event;
				check = ae.check;
				break;
			}
		}

		if (!check) {
			return false;
		}

		// Check parity
		if (this.parity) {
			const a = this.parity === 'even';
			const b = check.result % 2 === 0;
			if (a !== b) {
				return false;
			}
		}

		// Check outcome
		if (this.outcome) {
			switch (this.outcome) {
				case 'critical':
					if (!context.config.isCritical()) {
						return false;
					}
					break;

				case 'fumble':
					if (!context.config.isFumble()) {
						return false;
					}
					break;

				default:
					if (context.config.isFumble()) {
						return false;
					}
					for (const target of context.config.getTargets()) {
						switch (target.result) {
							case 'hit':
								if (this.outcome !== 'success') {
									return false;
								}
								break;
							case 'miss':
								if (this.outcome !== 'failure') {
									return false;
								}
								break;
						}
					}
					break;
			}
		}

		// Check attributes
		const a = [this.attributes.primary.value, this.attributes.secondary.value].filter(Boolean);
		const b = [check.result.primary, check.result.secondary];
		if (a.length > 0) {
			if (!a.every((v) => b.includes(v))) {
				return false;
			}
		}

		// Check result
		if (this.result > 0 && check.result <= this.result) {
			return false;
		}

		return true;
	}
}
