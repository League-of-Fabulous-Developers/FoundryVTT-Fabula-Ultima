import { LocallyEmbeddedDocumentField } from '../classFeature/locally-embedded-document-field.mjs';
import { CharacterDataModel } from '../../actors/character/character-data-model.mjs';

/**
 * @typedef CoagulationEffect
 * @property {number} coagulationLevel
 * @property {ActiveEffect} effect
 */

/**
 * @property {string} fuid
 * @property {string} source
 * @property {string} summary
 * @property {"all", "weapon"} socketable
 * @property {"", "weapon", "armor"} socketed
 * @property {1, 2} requiredSlots
 * @property {ActiveEffect} weaponEffect
 * @property {ActiveEffect} armorEffect
 * @property {CoagulationEffect[]} coagulationEffects
 */
export class HoplosphereDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { StringField, ArrayField, NumberField, SchemaField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			source: new StringField({ initial: '', blank: true }),
			summary: new StringField({ initial: '', blank: true }),
			socketable: new StringField({ initial: 'all', options: ['all', 'weapon'] }),
			requiredSlots: new NumberField({ initial: 1, choices: [1, 2] }),
			weaponEffect: new LocallyEmbeddedDocumentField(ActiveEffect, Item),
			armorEffect: new LocallyEmbeddedDocumentField(ActiveEffect, Item),
			coagulationEffects: new ArrayField(
				new SchemaField({
					coagulationLevel: new NumberField({ initial: 2, min: 2, integer: true }),
					effect: new LocallyEmbeddedDocumentField(ActiveEffect, Item),
				}),
			),
		};
	}

	#applyEffects = false;
	#coagLevel = 0;

	get coagLevel() {
		return this.#coagLevel;
	}

	prepareBaseData() {
		this.#applyEffects = false;
		this.#coagLevel = 0;
	}

	prepareDerivedData() {
		const actor = this.parent.actor;
		this.socketed = actor && actor.system instanceof CharacterDataModel && actor.system.technospheres.isSocketed(this);
		if (this.socketed) {
			const socketedInSameItem = actor.system.technospheres[this.socketed].socketed;
			const similarHoplospheres = socketedInSameItem.filter((item) => this.#isSimilarHoplosphere(item));
			this.#coagLevel = similarHoplospheres.length;
			if (this.parent === similarHoplospheres[0]) {
				this.#applyEffects = true;
			}
		}
	}

	transferEffects() {
		return this.#applyEffects;
	}

	shouldApplyEffect(effect) {
		if (this.socketed === 'armor' && effect === this.armorEffect) {
			return true;
		}
		if (this.socketed === 'weapon' && effect === this.weaponEffect) {
			return true;
		}
		if (this.#coagLevel > 1) {
			return this.coagulationEffects.some((coag) => coag.coagulationLevel <= this.#coagLevel && coag.effect === effect);
		}
		return false;
	}

	/**
	 * @param {Item} item
	 * @returns {boolean}
	 */
	#isSimilarHoplosphere(item) {
		return item.system instanceof HoplosphereDataModel && item.system.fuid === this.fuid;
	}

	async renderInlay() {
		const element = document.createElement('div');
		element.classList.add('flexrow', 'item-full', 'start');
		element.style.gap = '0.5em';
		element.innerHTML = `
          <div>
            <span><strong>${game.i18n.localize('FU.Summary')}: </strong></span>
            <span class="description-effect">${this.summary}</span>
          </div>
          ${this.#coagLevel > 1 ? `<div class="flex0"><i class="fas fa-droplet" data-tooltip="${game.i18n.localize('FU.TechnospheresHoplospheresCoagulationLevel')}: ${this.coagLevel}"></i></div>` : ''}
          ${this.requiredSlots === 2 ? `<div class="flex0"><i class="fas fa-weight-hanging" data-tooltip="${game.i18n.localize('FU.TechnospheresHoplospheresRequiresTwoSlots')}"></i></div>` : ''}
          ${this.socketable === 'weapon' ? `<div class="flex0"><i class="ra ra-crossed-axes" data-tooltip="${game.i18n.localize('FU.TechnospheresHoplospheresSocketableWeaponOnly')}"></i></div>` : ''}
          <div class="flex0">
            <a data-action="toggleHoplosphereSocketed" data-item-id="${this.parent.id}">
              ${this.socketed === 'armor' ? '<i class="ra ra-helmet"></i>' : ''}
              ${this.socketed === 'weapon' ? '<i class="ra ra-sword"></i>' : ''}
              ${!this.socketed ? '<i class="far fa-circle"></i>' : ''}
            </a>
          </div>
        `;
		const elem = element.querySelector('[data-action=toggleHoplosphereSocketed]');
		elem.addEventListener('click', (e) => {
			this.parent.actor.system.technospheres.socket(this, 'weapon');
			return false;
		});
		elem.addEventListener('contextmenu', (e) => {
			if (this.socketable === 'all') {
				this.parent.actor.system.technospheres.socket(this, 'armor');
			} else {
				this.parent.actor.system.technospheres.socket(this, 'weapon');
			}
			return false;
		});
		return element;
	}
}
