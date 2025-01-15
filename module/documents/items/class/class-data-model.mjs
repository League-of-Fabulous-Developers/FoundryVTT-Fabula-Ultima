import { ClassMigrations } from './class-migrations.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';

const tagProperties = {
	'benefits.resources.hp.value': 'FU.BenefitHp',
	'benefits.resources.mp.value': 'FU.BenefitMp',
	'benefits.resources.ip.value': 'FU.BenefitIp',
	'benefits.martials.melee.value': 'FU.BenefitMelee',
	'benefits.martials.ranged.value': 'FU.BenefitRanged',
	'benefits.martials.armor.value': 'FU.BenefitArmor',
	'benefits.martials.shields.value': 'FU.BenefitShields',
	'benefits.rituals.arcanism.value': 'FU.Arcanism',
	'benefits.rituals.chimerism.value': 'FU.Chimerism',
	'benefits.rituals.elementalism.value': 'FU.Elementalism',
	'benefits.rituals.entropism.value': 'FU.Entropism',
	'benefits.rituals.ritualism.value': 'FU.Ritualism',
	'benefits.rituals.spiritism.value': 'FU.Spiritism',
};

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof ClassDataModel) {
		const tags = Object.entries(tagProperties)
			.filter(([property]) => foundry.utils.getProperty(item.system, property))
			.map(([, translation]) => ({ tag: translation }));
		if (tags.length > 0) {
			sections.push({
				partial: 'systems/projectfu/templates/chat/partials/chat-item-tags.hbs',
				data: { tags },
			});
		}

		if (item.system.summary.value || item.system.description) {
			sections.push(async () => ({
				partial: 'systems/projectfu/templates/chat/partials/chat-item-description.hbs',
				data: {
					summary: item.system.summary.value,
					description: await TextEditor.enrichHTML(item.system.description),
				},
			}));
		}
	}
});

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {number} level.value
 * @property {number} level.min
 * @property {number} level.max
 * @property {boolean} benefits.resources.hp.value
 * @property {boolean} benefits.resources.mp.value
 * @property {boolean} benefits.resources.ip.value
 * @property {boolean} benefits.martials.melee.value
 * @property {boolean} benefits.martials.ranged.value
 * @property {boolean} benefits.martials.armor.value
 * @property {boolean} benefits.martials.shields.value
 * @property {boolean} benefits.rituals.arcanism.value
 * @property {boolean} benefits.rituals.chimerism.value
 * @property {boolean} benefits.rituals.elementalism.value
 * @property {boolean} benefits.rituals.entropism.value
 * @property {boolean} benefits.rituals.ritualism.value
 * @property {boolean} benefits.rituals.spiritism.value
 * @property {string} source.value
 */
export class ClassDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			level: new SchemaField({
				value: new NumberField({ initial: 1, min: 1, max: 10, nullable: false }),
				max: new NumberField({ initial: 10, min: 1, nullable: false }),
				min: new NumberField({ initial: 0, min: 0, nullable: false }),
			}),
			benefits: new SchemaField({
				resources: new SchemaField({
					hp: new SchemaField({ value: new BooleanField() }),
					mp: new SchemaField({ value: new BooleanField() }),
					ip: new SchemaField({ value: new BooleanField() }),
				}),
				martials: new SchemaField({
					melee: new SchemaField({ value: new BooleanField() }),
					ranged: new SchemaField({ value: new BooleanField() }),
					armor: new SchemaField({ value: new BooleanField() }),
					shields: new SchemaField({ value: new BooleanField() }),
				}),
				rituals: new SchemaField({
					arcanism: new SchemaField({ value: new BooleanField() }),
					chimerism: new SchemaField({ value: new BooleanField() }),
					elementalism: new SchemaField({ value: new BooleanField() }),
					entropism: new SchemaField({ value: new BooleanField() }),
					ritualism: new SchemaField({ value: new BooleanField() }),
					spiritism: new SchemaField({ value: new BooleanField() }),
				}),
			}),
			source: new SchemaField({ value: new StringField() }),
		};
	}

	static migrateData(source) {
		ClassMigrations.run(source);
		return source;
	}
}
