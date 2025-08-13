import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { CheckHooks } from '../../../../checks/check-hooks.mjs';
import { Checks } from '../../../../checks/checks.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

/**
 * @typedef {"effect", "planted", "removed"} MagiseedAction
 */

const magiseedActionKey = 'magiseedAction';

/**
 * @type RenderCheckHook
 */
const onRenderCheck = (sections, check, actor, item, additionalFlags) => {
	if (check.type === 'display' && item && item.system?.data instanceof MagiseedDataModel) {
		/** @type MagiseedAction */
		const action = check.additionalData[magiseedActionKey];

		const gardenName = foundry.utils.getProperty(actor, 'system.floralist.garden.system.data.gardenName') || foundry.utils.getProperty(actor, 'system.floralist.garden.name') || game.i18n.localize('FU.ClassFeatureGarden');

		switch (action) {
			case 'effect': {
				let floralistData = actor?.system?.floralist;
				if (!floralistData?.garden) {
					sections.push({
						partial: 'systems/projectfu/templates/feature/floralist/magiseed-chat-message.hbs',
						data: { message: game.i18n.localize('FU.ClassFeatureMagiseedGrowthClockNoClockFound') },
					});
					break;
				}
				const filledSections = floralistData.garden.system.data.clock.current;
				let effect = null;
				for (const value of item.system.data.effects) {
					if (value.start <= filledSections && value.end >= filledSections) {
						effect = value;
						break;
					}
				}
				if (effect == null) {
					sections.push({
						partial: 'systems/projectfu/templates/feature/floralist/magiseed-chat-message.hbs',
						data: { message: game.i18n.localize('FU.ClassFeatureMagiseedGrowthClockNoMatchingEffect') },
					});
					break;
				}
				sections.push(
					TextEditor.enrichHTML(effect.effect, { rollData: item.getRollData() }).then((enriched) => ({
						partial: 'systems/projectfu/templates/feature/floralist/magiseed-chat-effect.hbs',
						data: { ...effect, effect: enriched },
					})),
				);
				break;
			}
			case 'planted': {
				sections.push({
					partial: 'systems/projectfu/templates/feature/floralist/magiseed-chat-message.hbs',
					data: {
						message: game.i18n.format('FU.ClassFeatureMagiseedGardenAdded', {
							item: item.name,
							garden: gardenName,
						}),
					},
				});
				break;
			}
			case 'removed': {
				sections.push({
					partial: 'systems/projectfu/templates/feature/floralist/magiseed-chat-message.hbs',
					data: {
						message: game.i18n.format('FU.ClassFeatureMagiseedGardenRemoved', {
							item: item.name,
							garden: gardenName,
						}),
					},
				});
				break;
			}
		}
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @extends projectfu.ClassFeatureDataModel
 * @property {string} trigger
 * @property {string} description
 */
export class MagiseedDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { NumberField, ArrayField, SchemaField, HTMLField } = foundry.data.fields;
		return {
			effectCount: new NumberField({ initial: 1, min: 1, max: 3, integer: true }),
			effects: new ArrayField(
				new SchemaField({
					start: new NumberField({ initial: 1, min: 0, max: 3, integer: true }),
					end: new NumberField({ initial: 1, min: 1, max: 4, integer: true }),
					effect: new HTMLField(),
				}),
				{
					initial: [
						{
							start: 1,
							end: 3,
							effect: '',
						},
					],
				},
			),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/floralist/magiseed-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/floralist/magiseed-preview.hbs';
	}

	static get expandTemplate() {
		return 'systems/projectfu/templates/feature/floralist/magiseed-description.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureMagiseed';
	}

	static async getAdditionalData(model) {
		// Provide any additional data needed for the template rendering
		return {
			isCharacter: model.actor?.type === 'character',
			active: model.actor?.system?.floralist?.planted === model.item,
			effects: await Promise.all(model.effects.map((effect) => TextEditor.enrichHTML(effect.effect, { rollData: model.item?.rollData ?? {} }))),
		};
	}

	static getTabConfigurations() {
		return [
			{
				group: 'magiseedTabs',
				navSelector: '.magiseed-tabs',
				contentSelector: '.magiseed-content',
				initial: 'effect0',
			},
		];
	}

	static processUpdateData(data, model) {
		data.effects = Array.from(Object.values(data.effects));
		data.effects.forEach((effect, index, array) => {
			if (index > 0) {
				if (array[index - 1].end >= effect.start) {
					effect.start = Math.min(array[index - 1].end + 1, 4);
				}
			}
			if (effect.start > effect.end) {
				effect.end = effect.start;
			}
			if (!effect.effect) {
				effect.effect = model.effects[index]?.effect ?? '';
			}
		});
		data.effects = data.effects.slice(0, data.effectCount);
		data.effects = data.effects.filter((effect) => effect.start <= 4);

		while (data.effects.length < data.effectCount) {
			console.log(data.effects.length, data.effectCount, data.effects.length < data.effectCount);
			const previous = data.effects.at(-1) ?? { start: 1, end: 3 - data.effectCount, effect: '' };
			data.effects.push({
				start: previous.end + 1,
				end: previous.end + 1,
				effect: previous.effect,
			});
		}

		console.log(foundry.utils.duplicate(data));
		return data;
	}

	static async roll(model, item, shiftClick) {
		return Checks.display(item.actor, item, (check) => (check.additionalData[magiseedActionKey] = 'effect'));
	}

	postPlanted() {
		return Checks.display(this.actor, this.item, (check) => (check.additionalData[magiseedActionKey] = 'planted'));
	}

	postRemoved() {
		return Checks.display(this.actor, this.item, (check) => (check.additionalData[magiseedActionKey] = 'removed'));
	}
}
