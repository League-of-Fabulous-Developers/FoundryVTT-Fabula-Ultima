import { PseudoDocumentCollectionField } from '../../pseudo/pseudo-document-collection-field.mjs';
import { PseudoItem } from '../../pseudo/pseudo-item.mjs';
import { PseudoDocumentEnabledTypeDataModel } from '../../pseudo/enable-pseudo-documents-mixin.mjs';
import { SkillDataModel } from '../skill/skill-data-model.mjs';
import { SYSTEM } from '../../../helpers/config.mjs';
import { SETTINGS } from '../../../settings.js';

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
		const { StringField, NumberField, SchemaField, BooleanField } = foundry.data.fields;
		return {
			source: new StringField({ blank: true }),
			class: new StringField({ blank: true }),
			isFavored: new SchemaField({ value: new BooleanField() }),
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

	/**
	 * @returns {Promise<HTMLElement|string>}
	 */
	async renderInlay() {
		return `
          <div class="flexrow item-full start">
          	<div>
            	<span><strong>${game.i18n.localize('FU.Class')}: </strong></span>
            	<span class="description-effect">${this.class}</span>
			</div>
          </div>
        `;
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
}
