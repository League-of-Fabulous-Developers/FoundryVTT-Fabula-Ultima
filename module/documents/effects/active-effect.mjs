import { FUActor } from '../actors/actor.mjs';
import { SYSTEM } from '../../settings.js';
import { FUItem } from '../items/item.mjs';

const CRISIS_INTERACTION = 'CrisisInteraction';

const TEMPORARY = 'Temporary';

const crisisInteractions = {
	none: 'FU.EffectCrisisInteractionNone',
	active: 'FU.EffectCrisisInteractionActive',
	inactive: 'FU.EffectCrisisInteractionInactive',
};

export function onRenderActiveEffectConfig(sheet, html) {
	const flag = sheet.document.getFlag(SYSTEM, CRISIS_INTERACTION);
	html.find('.tab[data-tab=details] .form-group:nth-child(3)').after(`
	<div class="form-group">
        <label>${game.i18n.localize('FU.EffectCrisisInteraction')}</label>
        <select name="flags.${SYSTEM}.${CRISIS_INTERACTION}" ${sheet.isEditable ? '' : 'disabled'}>
          ${Object.entries(crisisInteractions).map(([key, value]) => `<option value="${key}" ${key === flag ? 'selected' : ''}>${game.i18n.localize(value)}</option>`)}
        </select>
    </div>
	`);
	sheet.setPosition({ ...sheet.position, height: 'auto' });
}

export class FUActiveEffect extends ActiveEffect {
	static get TEMPORARY_FLAG() {
		return TEMPORARY;
	}

	async _preCreate(data, options, user) {
		this.updateSource({ name: game.i18n.localize(data.name) });
		return super._preCreate(data, options, user);
	}

	get isSuppressed() {
		if (this.target instanceof FUActor) {
			const flag = this.getFlag(SYSTEM, CRISIS_INTERACTION);
			if (flag && flag !== 'none') {
				if (this.target.statuses.has('crisis')) {
					return flag === 'inactive';
				} else {
					return flag === 'active';
				}
			}
		}
		if (this.target instanceof FUItem && this.target.parent instanceof FUActor) {
			const flag = this.getFlag(SYSTEM, CRISIS_INTERACTION);
			if (flag && flag !== 'none') {
				if (this.target.parent.statuses.has('crisis')) {
					return flag === 'inactive';
				} else {
					return flag === 'active';
				}
			}
		}
		return false;
	}

	get isTemporary() {
		return super.isTemporary || !!this.getFlag(SYSTEM, TEMPORARY);
	}

	apply(target, change) {
		if (change.value && typeof change.value === 'string') {
			try {
				const expression = Roll.replaceFormulaData(change.value, this.parent);
				const value = Roll.validate(expression) ? Roll.safeEval(expression) : change.value;
				console.debug('Substituting change variable:', change.value, value);
				change.value = String(value ?? 0);
			} catch (e) {
				console.error(e);
				ui.notifications?.error(
					game.i18n.format('FU.EffectChangeInvalidFormula', {
						key: change.key,
						effect: this.name,
						target: target.name,
					}),
				);
				return {};
			}
		}

		return super.apply(target, change);
	}
}
