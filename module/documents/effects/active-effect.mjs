import { FUActor } from '../actors/actor.mjs';
import { FUItem } from '../items/item.mjs';
import { SYSTEM } from '../../helpers/config.mjs';

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

/**
 * @param {FUActor} actor
 * @param {EffectChangeData} change
 * @param current
 * @param delta
 */
export function onApplyActiveEffect(actor, change, current, delta) {
	if (game.release.isNewer(12)) {
		if (change.key.startsWith('system.') && current instanceof foundry.abstract.DataModel && Object.hasOwn(current, change.value) && current[change.value] instanceof Function) {
			console.debug(`applying ${change.value} to ${change.key}`);
			const newValue = current.clone();
			newValue[change.value]();
			foundry.utils.setProperty(actor, change.key, newValue);
			return false;
		}
	} else {
		if (change.key.startsWith('system.') && current instanceof foundry.abstract.DataModel && Object.hasOwn(current, delta) && current[delta] instanceof Function) {
			console.debug(`applying ${delta} to ${change.key}`);
			current[delta]();
			return false;
		}
	}
}

const PRIORITY_CHANGES = [
	'system.resources.hp.bonus',
	'system.resources.hp.attribute',
	'system.resources.mp.bonus',
	'system.resources.mp.attribute',
	'system.resources.ip.bonus',
	'system.attributes.dex.base',
	'system.attributes.ins.base',
	'system.attributes.mig.base',
	'system.attributes.wlp.base',
];

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

	prepareBaseData() {
		super.prepareBaseData();
		for (let change of this.changes) {
			if (PRIORITY_CHANGES.includes(change.key)) {
				change.priority = change.mode;
			} else {
				change.priority = (change.mode + 1) * 10;
			}
		}
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
