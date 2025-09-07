import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { TextEditor } from '../text-editor.mjs';

/**
 * @typedef {"temporary", "passive", "inactive"} ActiveEffectState
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
	document;

	/**
	 * @param {ActiveEffectState} effectState
	 */
	constructor(effectState) {
		super();
		this.#effectState = effectState;
	}

	static #getItems(document) {
		this.document = document;

		let effects = [];
		if (document instanceof Actor) {
			effects = [...document.allApplicableEffects()];
		}
		if (document instanceof Item) {
			effects = [...document.effects];
		}

		switch (this.#effectState) {
			case 'temporary':
				return effects.filter((effect) => effect.isTemporary && effect.active);
			case 'passive':
				return effects.filter((effect) => effect.active && !effect.isTemporary);
			case 'inactive':
				return effects.filter((effect) => !effect.active);
			default:
				return [];
		}
	}

	static #getDescription(effect) {
		return TextEditor.enrichHTML(effect.description, {
			secrets: this.document.isOwner,
			rollData: this.document.getRollData && this.document.getRollData(),
			relativeTo: this.document,
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
			default:
				return game.i18n.localize('FU.ActiveEffects');
		}
	}

	static #renderEffectName(effect) {
		const suppressed = effect.suppressed && !effect.disabled;

		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/cell/cell-effect-name.hbs', { name: effect.name, img: effect.img, suppressed: suppressed });
	}

	static #getSource(effect) {
		return effect.sourceName;
	}

	static #getDuration(effect) {
		return effect.system.eventLabel;
	}

	static #renderControlsHeader() {
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/header/header-effect-controls'), { type: this.#effectState });
	}

	static #renderControls(effect) {
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-effect-controls'), { active: !effect.disabled, effect: effect, system: effect.system });
	}
}
