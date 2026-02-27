/**
 * @property {Boolean} progress Whether the effect progress should stack, increasing it when re-applied.
 * @property {Boolean} duration Whether the effect duration should stack, increasing it when re-applied.
 * @property {Number} increment The increment of the relevant properties when stacking.
 */
export class EffectStackingDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { BooleanField, NumberField } = foundry.data.fields;
		return {
			progress: new BooleanField(),
			duration: new BooleanField(),
			increment: new NumberField({ initial: 1, nullable: false }),
		};
	}

	get enabled() {
		return (this.progress || this.duration) && this.increment;
	}
}
