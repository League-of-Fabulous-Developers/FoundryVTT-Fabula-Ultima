import { FUActor } from '../actors/actor.mjs';
import { FUItem } from '../items/item.mjs';
import { SYSTEM } from '../../helpers/config.mjs';
import { ExpressionContext, Expressions } from '../../expressions/expressions.mjs';

const CRISIS_INTERACTION = 'CrisisInteraction';
const EFFECT_TYPE = 'type';
const PAGE_REFERENCE = 'source';
const TEMPORARY = 'Temporary';

const crisisInteractions = {
	none: 'FU.EffectCrisisInteractionNone',
	active: 'FU.EffectCrisisInteractionActive',
	inactive: 'FU.EffectCrisisInteractionInactive',
};

const effectType = {
	default: 'FU.Effect',
	quality: 'FU.Quality',
	customization: 'FU.Customization',
};

function onRenderActiveEffectConfig(sheet, html) {
	const flag = sheet.document.getFlag(SYSTEM, CRISIS_INTERACTION);
	const sourceFlag = sheet.document.getFlag(SYSTEM, PAGE_REFERENCE) || '';
	const effectTypeFlag = sheet.document.getFlag(SYSTEM, EFFECT_TYPE) || 'default'; // Default to 'effect'

	// Effect Type select field
	html.find('.tab[data-tab=details] .form-group:nth-child(3)').after(`
		<div class="form-group">
			<label>${game.i18n.localize('FU.EffectType')}</label>
			<select name="flags.${SYSTEM}.${EFFECT_TYPE}" ${sheet.isEditable ? '' : 'disabled'}>
				${Object.entries(effectType).map(
					([key, value]) =>
						`<option value="${key}" ${key === effectTypeFlag ? 'selected' : ''}>
				  ${game.i18n.localize(value)}</option>`,
				)}
			</select>
		</div>
	`);

	// Source input field
	html.find('.tab[data-tab=details] .form-group:nth-child(4)').after(`
		<div class="form-group">
			<label>${game.i18n.localize('FU.EffectSource')}</label>
			<input type="text" name="flags.${SYSTEM}.${PAGE_REFERENCE}" value="${sourceFlag}" ${sheet.isEditable ? '' : 'disabled'}>
		</div>
	`);

	html.find('.tab[data-tab=details] .form-group:nth-child(5)').after(`
	<div class="form-group">
        <label>${game.i18n.localize('FU.EffectCrisisInteraction')}</label>
        <select name="flags.${SYSTEM}.${CRISIS_INTERACTION}" ${sheet.isEditable ? '' : 'disabled'}>
          ${Object.entries(crisisInteractions).map(([key, value]) => `<option value="${key}" ${key === flag ? 'selected' : ''}>${game.i18n.localize(value)}</option>`)}
        </select>
    </div>
	`);

	sheet.setPosition({ ...sheet.position, height: 'auto' });
}
Hooks.on('renderActiveEffectConfig', onRenderActiveEffectConfig);

/**
 * @param {FUActor} actor
 * @param {EffectChangeData} change
 * @param current
 */
function onApplyActiveEffect(actor, change, current) {
	if (change.key.startsWith('system.') && current instanceof foundry.abstract.DataModel && Object.hasOwn(current, change.value) && current[change.value] instanceof Function) {
		console.debug(`applying ${change.value} to ${change.key}`);
		current[change.value]();
		return false;
	}
}
Hooks.on('applyActiveEffect', onApplyActiveEffect);

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
	'system.affinities.air.base',
	'system.affinities.bolt.base',
	'system.affinities.dark.base',
	'system.affinities.earth.base',
	'system.affinities.fire.base',
	'system.affinities.ice.base',
	'system.affinities.light.base',
	'system.affinities.physical.base',
	'system.affinities.poison.base',
];

/**
 * @typedef ActiveEffect
 * @property {DataModel} parent
 * @property {Boolean} isSuppressed Is there some system logic that makes this active effect ineligible for application?
 * @property {Document} target Retrieve the Document that this ActiveEffect targets for modification.
 * @property {Boolean} active Whether the Active Effect currently applying its changes to the target.
 * @property {Boolean modifiesActor Does this Active Effect currently modify an Actor?
 * @property {Boolean} isTemporary Describe whether the ActiveEffect has a temporary duration based on combat turns or rounds.
 * @property {Boolean} isEmbedded Test whether this Document is embedded within a parent Document
 * @property {String} id Canonical name
 * @property {String} uuid
 * @property {String} name
 * @property {EffectChangeData[]} changes - The array of EffectChangeData objects which the ActiveEffect applies
 * @remarks https://foundryvtt.com/api/classes/client.ActiveEffect.html
 * @property {Function<Promise<Document>>} delete Delete this Document, removing it from the database.
 * @property {Function<void>} update Update this Document using incremental data, saving it to the database.
 * @property {Function<String, String, *, void>} setFlag Assign a "flag" to this document. Flags represent key-value type data which can be used to store flexible or arbitrary data required by either the core software, game systems, or user-created modules.
 * @property {Function<String, String, *>} getFlag Get the value of a "flag" for this document See the setFlag method for more details on flags
 */

/**
 * @extends ActiveEffect
 * @inheritDoc
 * */
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
				if (this.target.effects.find((e) => e.statuses.has('crisis')) != null) {
					return flag === 'inactive';
				} else {
					return flag === 'active';
				}
			}
		}
		if (this.target instanceof FUItem && this.target.parent instanceof FUActor) {
			const flag = this.getFlag(SYSTEM, CRISIS_INTERACTION);
			if (flag && flag !== 'none') {
				if (this.target.parent.effects.find((e) => e.statuses.has('crisis')) != null) {
					return flag === 'inactive';
				} else {
					return flag === 'active';
				}
			}
		}
		return false;
	}

	get isTemporary() {
		// TODO: Handle differently or?
		if (this.statuses.has('crisis')) {
			return false;
		}
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

	/**
	 * @param {FUActor|FUItem} target
	 * @param {EffectChangeData} change
	 * @returns {{}|*}
	 */
	apply(target, change) {
		// Support expressions
		if (change.value && typeof change.value === 'string') {
			try {
				// First, evaluate using built-in support
				const expression = Roll.replaceFormulaData(change.value, this.parent);
				// Second, evaluate with our custom expressions
				const context = ExpressionContext.resolveTarget(target, this.parent);
				const value = Expressions.evaluate(expression, context);
				change.value = String(value ?? 0);
				console.debug(`Assigning ${change.key} = ${change.value}`);
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
