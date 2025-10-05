import { FU } from '../../helpers/config.mjs';
import { ProgressDataModel } from '../items/common/progress-data-model.mjs';

/**
 * @description THe active effect model for this system
 * @property {String} type The type of the effect
 * @property {ActiveEffectPredicateModel} predicate Used for toggling the effect
 * @property {String} duration.event The combat event which decrements the duration. Once it reaches 0, the effect is over.
 * @property {Number} duration.interval The number of occurrences between events
 * @property {Number} duration.remaining The number of intervals left.
 * @property {String} tracking Whom is the duration tracked on
 * @property {Object} rules Contains optional rules for this effect.
 * @property {ProgressDataModel} rules.progress It can be used for tracking a clock, a resource, a counter, etc.
 * @remarks The remaining property is initialized, and must be updated.
 */
export class FUActiveEffectModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { NumberField, SchemaField, StringField, EmbeddedDataField } = foundry.data.fields;
		return {
			type: new StringField({ initial: 'default', choices: Object.keys(FU.effectType) }),
			predicate: new EmbeddedDataField(ActiveEffectPredicateModel, {}),
			duration: new SchemaField({
				event: new StringField({ initial: 'none', choices: Object.keys(FU.effectDuration) }),
				interval: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
				tracking: new StringField({ initial: 'self', choices: Object.keys(FU.effectTracking) }),
				remaining: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
			}),
			rules: new SchemaField({
				progress: new EmbeddedDataField(ProgressDataModel, { required: false }),
			}),
		};
	}

	/**
	 * @returns {String}
	 */
	get eventLabel() {
		return game.i18n.localize(FU.effectDuration[this.duration.event]);
	}
}

/**
 * @description Used to toggle the active effect on/off based on the state
 * @property {String} crisisInteraction
 * @property {boolean} suppressed
 */
export class ActiveEffectPredicateModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField, BooleanField } = foundry.data.fields;
		return {
			crisisInteraction: new StringField({ initial: 'none', choices: Object.keys(FU.crisisInteractions) }),
			suppressed: new BooleanField({ initial: false }),
		};
	}
}
