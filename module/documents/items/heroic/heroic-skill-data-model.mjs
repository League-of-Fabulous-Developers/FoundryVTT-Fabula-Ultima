import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { FU } from '../../../helpers/config.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { FUSubTypedItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof HeroicSkillDataModel) {
		CommonSections.tags(sections, [
			{
				tag: FU.heroicType[item.system.subtype.value],
			},
			{
				tag: 'FU.Class',
				separator: ':',
				value: item.system.class.value,
				show: item.system.class.value,
			},
		]);

		if (item.system.requirement.value)
			sections.push({
				content: `
                  <div class='chat-desc'>
                    <p><strong>${game.i18n.localize('FU.Requirements')}: </strong>${item.system.requirement.value}</p>
                  </div>`,
			});

		if (item.system.hasResource.value) {
			CommonSections.resource(sections, item.system.rp);
		}

		CommonSections.description(sections, item.system.description, item.system.summary.value);
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
 * @property {string} source.value
 */
export class HeroicSkillDataModel extends FUSubTypedItemDataModel {
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
		deprecationNotice(this, 'impdamage.value');
		deprecationNotice(this, 'impdamage.impType.value');
		deprecationNotice(this, 'impdamage.type.value');
		deprecationNotice(this, 'benefits.resources.hp.value');
		deprecationNotice(this, 'benefits.resources.mp.value');
		deprecationNotice(this, 'benefits.resources.ip.value');
	}

	static defineSchema() {
		const { SchemaField, StringField, BooleanField, EmbeddedDataField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			class: new SchemaField({ value: new StringField() }),
			hasResource: new SchemaField({ value: new BooleanField() }),
			rp: new EmbeddedDataField(ProgressDataModel, {}),
			requirement: new SchemaField({ value: new StringField() }),
		});
	}

	get attributePartials() {
		return [ItemPartialTemplates.controls, ItemPartialTemplates.classField, ItemPartialTemplates.heroicSkill, ItemPartialTemplates.resourcePoints];
	}

	async renderInlay() {
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('item/heroic/item-heroic-inlay'), this);
	}

	updateHeroicResource(event, target) {
		let change = target.dataset.resourceAction === 'decrement' ? -1 : 1;
		if (event.type === 'contextmenu') {
			change *= this.rp.step;
		}

		const newValue = Math.clamp(this.rp.current + change, 0, this.rp.max || Number.MAX_SAFE_INTEGER);

		this.parent.update({
			'system.rp.current': newValue,
		});
	}
}
