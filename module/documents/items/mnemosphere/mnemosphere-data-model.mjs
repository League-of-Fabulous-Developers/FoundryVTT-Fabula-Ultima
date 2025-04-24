import { PseudoDocumentCollectionField } from '../../pseudo/pseudo-document-collection-field.mjs';
import { PseudoItem } from '../../pseudo/pseudo-item.mjs';
import { EnablePseudoDocuments } from '../../pseudo/enable-pseudo-documents-mixin.mjs';
import { CharacterDataModel } from '../../actors/character/character-data-model.mjs';
import { SkillDataModel } from '../skill/skill-data-model.mjs';

/**
 * @property {string} source
 * @property {string} class
 * @property {number} level
 * @property {number} maxLevel
 * @property {PseudoDocumentCollection} items
 * @property {"armor", "weapon", false} socketed
 */
export class MnemosphereDataModel extends EnablePseudoDocuments.forTypeDataModel(foundry.abstract.TypeDataModel) {
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
		const actor = this.parent.actor;
		this.socketed = actor && actor.system instanceof CharacterDataModel && this && actor.system.technospheres.isSocketed(this);
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
	 * @returns {Promise<HTMLElement>}
	 */
	async renderInlay() {
		const element = document.createElement('div');
		element.classList.add('flexrow', 'item-full', 'start');
		element.innerHTML = `
          <div>
            <span><strong>${game.i18n.localize('FU.Class')}: </strong></span>
            <span class="description-effect">${this.class}</span>
          </div>
          <div class="flex0">
            <a data-action="toggleMnemosphereSocketed" data-item-id="${this.parent.id}">
              ${this.socketed === 'armor' ? '<i class="ra ra-helmet"></i>' : ''}
              ${this.socketed === 'weapon' ? '<i class="ra ra-sword"></i>' : ''}
              ${!this.socketed ? '<i class="far fa-circle"></i>' : ''}
            </a>
          </div>
        `;
		let actionEl = element.querySelector('[data-action=toggleMnemosphereSocketed]');
		actionEl.addEventListener('click', (e) => {
			this.parent.actor.system.technospheres.socket(this, 'weapon');
		});
		actionEl.addEventListener('contextmenu', (e) => {
			this.parent.actor.system.technospheres.socket(this, 'armor');
		});
		return element;
	}

	transferNestedItem(item) {
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
