import { PseudoDocumentCollectionField } from '../../pseudo/pseudo-document-collection-field.mjs';
import { PseudoItem } from '../pseudo-item.mjs';
import { PseudoDocumentEnabledTypeDataModel } from '../../pseudo/enable-pseudo-documents-mixin.mjs';
import { SkillDataModel } from '../skill/skill-data-model.mjs';
import { SYSTEM } from '../../../helpers/config.mjs';
import { SETTINGS } from '../../../settings.js';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';

/**
 * @property {string} source
 * @property {string} class
 * @property {number} level
 * @property {number} maxLevel
 * @property {PseudoDocumentCollection} items
 * @property {"armor", "weapon", false} socketed
 */
export class MnemosphereDataModel extends PseudoDocumentEnabledTypeDataModel {
	static defineSchema() {
		const { StringField, NumberField } = foundry.data.fields;
		return {
			source: new StringField({ blank: true }),
			summary: new StringField({ blank: true }),
			class: new StringField({ blank: true }),
			level: new NumberField({ initial: 1, min: 1, validate: (value, options) => value <= (options.source.maxLevel ?? 5) }),
			maxLevel: new NumberField({ initial: 5, min: 1, max: 10 }),
			items: new PseudoDocumentCollectionField(PseudoItem),
		};
	}

	prepareDerivedData() {
		this.socketed = this.parent instanceof PseudoItem && ['armor', 'customWeapon', 'mnemosphereReceptacle'].includes(this.parent.parentDocument?.type);
		this.skills = this.items.filter((item) => item.type === 'skill');
		this.activeSkills = this.skills.filter((item) => item.system.level.value > 0);
		this.heroics = this.items.filter((item) => item.type === 'heroic');
		this.spells = this.items.filter((item) => item.type === 'spell');
		this.classFeatures = this.items.filter((item) => item.type === 'classFeature');
		this.other = this.items.filter((item) => !['skill', 'heroic', 'spell', 'classFeature'].includes(item.type));
	}

	transferEffects() {
		return !!this.socketed;
	}

	transferNestedItem(item) {
		if (!game.settings.get(SYSTEM, SETTINGS.technospheres)) {
			return false;
		}
		if (!this.socketed) {
			return false;
		}
		if (item.system instanceof SkillDataModel) {
			return item.system.level.value > 0;
		} else {
			return true;
		}
	}

	modifyLevel(event, target) {
		const change = target.closest('[data-level-action]')?.dataset?.levelAction === 'decrement' ? -1 : 1;

		const newValue = this.level + change;

		return this.parent.update({
			'system.level': Math.clamp(newValue, 0, this.maxLevel),
		});
	}
}

/** @type {RenderCheckHook} */
const onRenderDisplay = (sections, check, actor, item, additionalFlags) => {
	if (check.type === 'display' && item?.type === 'mnemosphere') {
		CommonSections.tags(sections, [
			{
				tag: 'FU.Class',
				value: item.system.class,
				show: !!item.system.class,
			},
		]);

		let skillText;
		if (item.system.activeSkills.length) {
			skillText = item.system.activeSkills
				.map((skill) => {
					return `<div><strong>${skill.name}</strong> (${skill.system.level.value} / ${skill.system.level.max})</div>`;
				})
				.join('\n');
		} else {
			skillText = '<div><strong>—</strong></div>';
		}
		CommonSections.genericText(sections, `<p><strong>${game.i18n.localize('FU.Skills')}</strong></p>` + skillText);
	}
};

Hooks.on(CheckHooks.renderCheck, onRenderDisplay);
