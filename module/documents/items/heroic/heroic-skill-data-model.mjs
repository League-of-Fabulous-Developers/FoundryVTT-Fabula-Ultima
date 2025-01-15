import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { FU } from '../../../helpers/config.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof HeroicSkillDataModel) {
		sections.push({
			partial: 'systems/projectfu/templates/chat/partials/chat-item-tags.hbs',
			data: {
				tags: [
					{
						tag: 'FU.Heroic',
						show: true,
					},
					{
						tag: game.i18n.localize('FU.Class') + ':',
						value: item.system.class.value,
						show: item.system.class.value,
					},
					{
						tag: game.i18n.localize('FU.Requirements') + ':',
						value: item.system.requirement.value,
						show: item.system.requirement.value,
					},
				].filter(({ show }) => show),
			},
		});

		if (item.system.hasResource.value) {
			sections.push({
				partial: 'systems/projectfu/templates/chat/partials/chat-resource-details.hbs',
				data: {
					data: item.system.rp.toObject(),
				},
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
 * @property {string} class.value
 * @property {string} requirement.value
 * @property {boolean} benefits.resources.hp.value
 * @property {boolean} benefits.resources.mp.value
 * @property {boolean} benefits.resources.ip.value
 * @property {string} source.value
 */
export class HeroicSkillDataModel extends foundry.abstract.TypeDataModel {
	static {
		deprecationNotice(this, 'level.min');
		deprecationNotice(this, 'level.value');
		deprecationNotice(this, 'level.max');
		deprecationNotice(this, 'useWeapon.accuracy.value');
		deprecationNotice(this, 'useWeapon.damage.value');
		deprecationNotice(this, 'useWeapon.hrZero.value');
		deprecationNotice(this, 'attributes.primary.value');
		deprecationNotice(this, 'attributes.secondary.value');
		deprecationNotice(this, 'accuracy.value');
		deprecationNotice(this, 'damage.hasDamage.value');
		deprecationNotice(this, 'damage.value');
		deprecationNotice(this, 'damage.type.value');
		deprecationNotice(this, 'impdamage.hasImpDamage.value');
		deprecationNotice(this, 'impdamage.impType.value');
		deprecationNotice(this, 'impdamage.type.value');
	}

	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, EmbeddedDataField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			subtype: new SchemaField({ value: new StringField({ initial: 'skill', choices: Object.keys(FU.heroicType) }) }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			class: new SchemaField({ value: new StringField() }),
			hasResource: new SchemaField({ value: new BooleanField() }),
			rp: new EmbeddedDataField(ProgressDataModel, {}),
			requirement: new SchemaField({ value: new StringField() }),
			benefits: new SchemaField({
				resources: new SchemaField({
					hp: new SchemaField({ value: new BooleanField() }),
					mp: new SchemaField({ value: new BooleanField() }),
					ip: new SchemaField({ value: new BooleanField() }),
				}),
			}),
			source: new SchemaField({
				value: new StringField(),
			}),
		};
	}
}
