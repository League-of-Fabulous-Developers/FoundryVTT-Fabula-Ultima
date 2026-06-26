import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { TextEditor } from '../text-editor.mjs';
import { PseudoItem } from '../../documents/items/pseudo-item.mjs';

/**
 * @typedef {"temporary", "passive", "inactive", "item"} ActiveEffectState
 */

export class ActiveEffectsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'active-effects-table',
		tablePreset: 'effect',
		getItems: ActiveEffectsTableRenderer.#getItems,
		renderDescription: CommonDescriptions.descriptionWithCustomEnrichment(ActiveEffectsTableRenderer.#getDescription),
		columns: {
			name: {
				headerAlignment: 'start',
				renderHeader: ActiveEffectsTableRenderer.#renderEffectNameHeader,
				renderCell: ActiveEffectsTableRenderer.#renderEffectName,
			},
			source: CommonColumns.textColumn({ columnLabel: 'FU.Source', importance: 'high', getText: ActiveEffectsTableRenderer.#getSource }),
			duration: CommonColumns.textColumn({ columnLabel: 'FU.Duration', importance: 'high', getText: ActiveEffectsTableRenderer.#getDuration }),
			controls: {
				headerAlignment: 'end',
				renderHeader: ActiveEffectsTableRenderer.#renderControlsHeader,
				renderCell: ActiveEffectsTableRenderer.#renderControls,
			},
		},
	};

	/** @type ActiveEffectState */
	#effectState;

	/**
	 * this is a terrible hack and might cause timing issues, but I couldn't think of anything else :<
	 * @type {FUActor | FUItem}
	 */
	#document;

	/**
	 * this is a terrible hack and might cause timing issues, but I couldn't think of anything else :<
	 * @type {ActiveEffect[]}
	 */
	#applicableEffects = [];

	/**
	 * @param {ActiveEffectState} effectState
	 * @param {Partial<TableConfig>} [overrides]
	 */
	constructor(effectState, overrides) {
		super(overrides);
		this.#effectState = effectState;
	}

	static #getItems(document) {
		this.#document = document;
		this.#applicableEffects = [...document.allApplicableEffects()];

		let effects = [];
		if (document instanceof Actor) {
			if (this.#effectState === 'item') {
				effects = [...document.allEffects()];
			} else {
				effects = [...document.allApplicableEffects()];
			}
		}
		if (document instanceof Item || document instanceof PseudoItem) {
			effects = [...document.effects];
		}

		switch (this.#effectState) {
			case 'temporary':
				return effects.filter((effect) => effect.isTemporary);
			case 'passive':
				return effects.filter((effect) => !effect.isTemporary && effect.active);
			case 'inactive':
				return effects.filter((effect) => !effect.isTemporary && !effect.active);
			case 'item': {
				return effects.filter((effect) => effect.isTemporary && (effect.target !== document || !this.#applicableEffects.includes(effect)));
			}
			default:
				return [];
		}
	}

	static #getDescription(effect) {
		return TextEditor.enrichHTML(effect.description, {
			secrets: this.#document.isOwner,
			rollData: this.#document.getRollData && this.#document.getRollData(),
			relativeTo: this.#document,
		});
	}

	static #renderEffectNameHeader() {
		switch (this.#effectState) {
			case 'temporary':
				return game.i18n.localize('FU.TemporaryEffects');
			case 'passive':
				return game.i18n.localize('FU.PassiveEffects');
			case 'inactive':
				return game.i18n.localize('FU.InactiveEffects');
			case 'item':
				return game.i18n.localize('FU.TemporaryEffectsItems');
			default:
				return game.i18n.localize('FU.ActiveEffects');
		}
	}

	static #renderEffectName(effect) {
		const notAppliedToDocument = effect.target === this.#document && !this.#applicableEffects.includes(effect);
		const suppressed = (effect.isSuppressed && !effect.disabled) || notAppliedToDocument;

		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/cell/cell-effect-name.hbs', { name: effect.name, img: effect.img, suppressed: suppressed, progress: effect.system.rules.progress });
	}

	static #getSource(effect) {
		return effect.sourceName;
	}

	static #getDuration(effect) {
		return effect.system.eventLabel;
	}

	static #renderControlsHeader() {
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/header/header-effect-controls'), { type: this.#effectState, disabled: this.#effectState === 'item' });
	}

	static #renderControls(effect) {
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-effect-controls'), { active: !effect.disabled, effect: effect, system: effect.system });
	}
}
