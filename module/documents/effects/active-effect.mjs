import { FUActor } from '../actors/actor.mjs';
import { SYSTEM } from '../../settings.js';

const CRISIS_INTERACTION = 'CrisisInteraction';

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
        <select name="flags.${SYSTEM}.${CRISIS_INTERACTION}">
          ${Object.entries(crisisInteractions).map(([key, value]) => `<option value="${key}" ${key === flag ? 'selected' : ''}>${game.i18n.localize(value)}</option>`)}
        </select>
    </div>
	`);
	sheet.setPosition({ ...sheet.position, height: 'auto' });
}

export class FUActiveEffect extends ActiveEffect {
	async _preCreate(data, options, user) {
		this.updateSource({ name: game.i18n.localize(data.name) });
		return super._preCreate(data, options, user);
	}

	get isSuppressed() {
		const flag = this.getFlag(SYSTEM, CRISIS_INTERACTION);
		if (flag !== 'none' && this.target instanceof FUActor) {
			if (this.target.statuses.has('crisis')) {
				return flag === 'inactive';
			} else {
				return flag === 'active';
			}
		}
		return false;
	}

	apply(actor, change) {
		if (change.value && typeof change.value === 'string') {
			const source = CONFIG.ActiveEffect.legacyTransferral ? this.source : this.parent;
			try {
				const expression = Roll.replaceFormulaData(change.value, source);
				const value = Roll.validate(expression) ? Roll.safeEval(expression) : change.value;
				console.debug('Substituting change variable:', change.value, value);
				change.value = String(value ?? 0);
			} catch (e) {
				console.error(e);
				ui.notifications?.error(game.i18n.format('FU.EffectChangeInvalidFormula', { key: change.key, effect: this.name, target: actor.name }));
			}
		}

		return super.apply(actor, change);
	}
}
