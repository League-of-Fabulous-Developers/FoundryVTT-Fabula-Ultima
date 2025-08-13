import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { ProgressDataModel } from '../../common/progress-data-model.mjs';

/**
 * @extends projectfu.ClassFeatureDataModel
 * @property {string} gardenName
 * @property {ProgressDataModel} clock
 */
export class GardenDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { StringField, NumberField, SchemaField } = foundry.data.fields;
		return {
			gardenName: new StringField({ initial: '', blank: true }),
			clock: new SchemaField({
				name: new StringField({ initial: '', blank: true }),
				current: new NumberField({ initial: 0, min: 0, max: 4, integer: true }),
			}),
		};
	}

	prepareData() {
		this.clock = new ProgressDataModel(
			{
				name: this.clock.name,
				current: this.clock.current,
				step: 1,
				max: 4,
			},
			{ parent: this },
		);
	}

	static get template() {
		return 'systems/projectfu/templates/feature/floralist/garden-sheet.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureGarden';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/floralist/garden-preview.hbs';
	}

	static getAdditionalData(model) {
		return {
			isCharacter: model.actor?.type === 'character',
			active: model.actor?.system?.floralist?.garden === model.item,
		};
	}

	static activateListeners(html, item, sheet) {
		html.querySelectorAll('[data-action]').forEach((el) => {
			el.addEventListener('click', (e) => {
				const action = e.currentTarget.dataset.action;

				const delta = action === 'increment' ? 1 : -1;

				const newValue = Math.clamp(item.system.data.clock.current + delta, 0, 4);

				return item.update({ 'system.data.clock.current': newValue });
			});
		});

		html.querySelectorAll('.progress input').forEach((el) => {
			el.addEventListener('click', (e) => item.update({ 'system.data.clock.current': e.currentTarget.value }));
			el.addEventListener('contextmenu', (e) => item.update({ 'system.data.clock.current': 0 }));
		});
	}
}
