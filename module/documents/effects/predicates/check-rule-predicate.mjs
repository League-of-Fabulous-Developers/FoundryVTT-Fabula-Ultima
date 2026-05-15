import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';
import { ItemAttributesDataModel } from '../../items/common/item-attributes-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUParity} parity
 * @property {FUCheckOutcome} outcome
 * @property {ItemAttributesDataModel} attributes
 * @property {Number} result A specific result of the check.
 * @property {FUPredicateQuantifier} quantifier
 */
export class CheckRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'checkRulePredicate' });
	}

	static get metadata() {
		return {
			...super.metadata,
			eventTypes: [FUHooks.RENDER_CHECK_EVENT, FUHooks.RESOLVE_CHECK_EVENT, FUHooks.ATTACK_EVENT, FUHooks.CALCULATE_DAMAGE_EVENT, FUHooks.PERFORM_CHECK_EVENT],
		};
	}

	// TODO: Finish porting..
	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			parity: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.parity) }),
			outcome: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.checkOutcome) }),
			attributes: new fields.EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: '' }, secondary: { value: '' } } }),
			result: new fields.NumberField({ integer: true }),
			quantifier: new fields.StringField({
				initial: 'any',
				blank: true,
				choices: Object.keys(FU.predicateQuantifier),
			}),
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
		let check = context.check;
		let targets = context.targets;

		if (!context.check || !context.targets) {
			if (context.config) {
				check = context.config.check;
				targets = context.config.getTargets();
			} else {
				console.warn(`No configuration provided for check in the event ${context.eventType}.`);
				return false;
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
					if (!check.critical) {
						return false;
					}
					break;

				case 'fumble':
					if (!check.fumble) {
						return false;
					}
					break;

				default:
					{
						// 'success' or 'failure'
						if (this.outcome === 'success' && check.fumble) {
							return false;
						} else if (this.outcome === 'failure' && check.critical) {
							return false;
						}

						const inspector = CheckConfiguration.inspect(check);
						const difficulty = inspector.getDifficulty();
						if (difficulty != null) {
							if (this.outcome === 'success' && check.result < difficulty) {
								return false;
							} else if (this.outcome === 'failure' && check.result >= difficulty) {
								return false;
							}
						} else {
							const selected = targets;
							if (selected.length > 0) {
								switch (this.quantifier) {
									case 'all':
										if (
											!selected.every((target) => {
												if (target.result === 'hit') return this.outcome === 'success';
												if (target.result === 'miss') return this.outcome === 'failure';
												return true;
											})
										) {
											return false;
										}
										break;

									case 'any':
										if (
											!selected.some((target) => {
												if (target.result === 'hit') return this.outcome === 'success';
												if (target.result === 'miss') return this.outcome === 'failure';
												return false;
											})
										) {
											return false;
										}
										break;

									case 'none':
										if (
											!selected.every((target) => {
												if (target.result === 'hit') return this.outcome !== 'success';
												if (target.result === 'miss') return this.outcome !== 'failure';
												return true;
											})
										) {
											return false;
										}
										break;
								}
							}
						}
					}
					break;
			}
		}

		// Check attributes
		const a = [this.attributes.primary.value, this.attributes.secondary.value];
		const b = context.eventType === FUHooks.PERFORM_CHECK_EVENT ? [check.primary, check.secondary] : [check.primary.attribute, check.secondary.attribute];
		for (let i = 0; i < a.length; i++) {
			const attribute = a[i];
			if (attribute) {
				const idx = b.findIndex((value) => value === attribute);
				if (idx >= 0) {
					b.splice(idx, 1);
				} else {
					return false;
				}
			}
		}

		// FIXME: Rule element workflow cannot access check results because the check has not yet been rolled when the predicate is checked
		// // Check result
		// if (this.result != null && check.result <= this.result) {
		// 	return false;
		// }

		return true;
	}
}
