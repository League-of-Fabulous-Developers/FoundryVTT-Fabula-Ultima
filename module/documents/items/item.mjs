import { SOCKET } from '../../socket.mjs';
import { ChecksV2 } from '../../checks/checks-v2.mjs';
import { slugify } from '../../util.mjs';
import { FUHooks } from '../../hooks.mjs';

const capitalizeFirst = (string) => (typeof string === 'string' ? string.charAt(0).toUpperCase() + string.slice(1) : string);

/**
 * @typedef KeyboardModifiers
 * @property {boolean} shift
 * @property {boolean} alt
 * @property {boolean} ctrl
 * @property {boolean} meta
 */

/**
 * @typedef Item
 * @property {Actor} actor
 * @property {String} uuid
 * @property {String} name
 * @property {Map<String, Object>} effects
 * @property {Object} FUActor
 */

/**
 * @description Extend the basic Item document with some very simple modifications.
 * @property {foundry.abstract.TypeDataModel} system
 * @extends {Item}
 * @inheritDoc
 */
export class FUItem extends Item {
	overrides = this.overrides ?? {};

	/**
	 * Augment the basic Item data model with additional dynamic data.
	 * This method is automatically called when an item is created or updated.
	 */
	prepareData() {
		// As with the actors class, items are documents that can have their data
		// preparation methods overridden (such as prepareBaseData()).
		super.prepareData();
		Hooks.callAll(FUHooks.DATA_PREPARED_ITEM, this);
	}

	/**
	 * Prepare a data object which is passed to any Roll formulas that are created related to this Item.
	 * @private
	 * @returns {object|null} The roll data object, or null if no actors is associated with this item.
	 */
	getRollData() {
		// If present, return the actors's roll data.
		if (!this.actor) return null;
		const rollData = this.actor.getRollData();

		// Grab the item's system data as well.
		rollData.item = foundry.utils.deepClone(this.system);

		return rollData;
	}

	/**
	 * @override
	 */
	toObject() {
		const result = super.toObject();
		result.uuid = this.uuid;
		return result;
	}

	/**
	 * Get the display data for a weapon item.
	 *
	 * @returns {object|boolean} An object containing weapon display information, or false if this is not a weapon.
	 * @property {string} attackString - The weapon's attack description.
	 * @property {string} damageString - The weapon's damage description.
	 * @property {string} qualityString - The weapon's quality description.
	 */
	getWeaponDisplayData(actor) {
		const isWeapon = this.type === 'weapon';
		const isBasic = this.type === 'basic';
		// Check if this item is not a weapon or not a weapon/shield with dual
		if (!isBasic && !isWeapon) {
			return false;
		}

		function translate(string) {
			const allTranslations = Object.assign({}, CONFIG.FU.handedness, CONFIG.FU.weaponCategories, CONFIG.FU.weaponTypes, CONFIG.FU.attributeAbbreviations, CONFIG.FU.damageTypes);
			if (string?.includes('.') && CONFIG.FU.defenses[string.split('.')[0]]) {
				const [category, subkey] = string.split('.');
				return game.i18n.localize(CONFIG.FU.defenses[category]?.[subkey] ?? string);
			}

			return game.i18n.localize(allTranslations?.[string] ?? string);
		}

		const hrZeroText = this.system.rollInfo?.useWeapon?.hrZero?.value ? `${game.i18n.localize('FU.HRZero')} +` : `${game.i18n.localize('FU.HighRollAbbr')} +`;
		const qualText = this.system.quality?.value || '';
		let qualityString = '';
		let detailString = '';

		const primaryAttribute = this.system.attributes?.primary?.value;
		const secondaryAttribute = this.system.attributes?.secondary?.value;

		const attackAttributes = [translate(primaryAttribute || '').toUpperCase(), translate(secondaryAttribute || '').toUpperCase()].join(' + ');

		const accuracyValue = this.system.accuracy?.value ?? 0;
		const accuracyGlobalValue = actor.system.bonuses.accuracy?.accuracyCheck ?? 0;
		const accuracyTotal = accuracyValue + accuracyGlobalValue;
		const damageValue = this.system.damage?.value ?? 0;
		const weaponType = this.system.type?.value;
		const defenseString = this.system?.defense ? translate(`${this.system.defense}.abbr`) : '';

		let damageGlobalValue = 0;
		if (weaponType === 'melee') {
			damageGlobalValue = actor.system.bonuses.damage?.melee ?? 0;
		} else if (weaponType === 'ranged') {
			damageGlobalValue = actor.system.bonuses.damage?.ranged ?? 0;
		}
		const damageTotal = damageValue + damageGlobalValue;

		const attackString = `【${attackAttributes}】${accuracyTotal > 0 ? ` +${accuracyTotal}` : ''}`;

		const damageTypeValue = translate(this.system.damageType?.value || '');

		const damageString = `【${hrZeroText} ${damageTotal}】 ${damageTypeValue}`;

		if (isWeapon) {
			detailString = [attackString, damageString].filter(Boolean).join('⬥');
			qualityString = [translate(this.system.category?.value), translate(this.system.hands?.value), translate(this.system.type?.value), defenseString, qualText].filter(Boolean).join(' ⬥ ');
		} else if (isBasic) {
			detailString = [attackString, damageString].filter(Boolean).join('⬥');
			qualityString = [translate(this.system.type?.value), defenseString, qualText].filter(Boolean).join(' ⬥ ');
		}

		return {
			attackString,
			damageString,
			detailString: `${detailString}`,
			qualityString: `${qualityString}`,
		};
	}

	/**
	 * Retrieves the display data for a spell item.
	 *
	 * @returns {object|boolean} An object containing spell display information, or false if this is not a spell.
	 * @property {string} attackString - The spell's attack description.
	 * @property {string} damageString - The spell's damage description.
	 * @property {string} detailString - The combined attack and damage descriptions.
	 * @property {string} qualityString - The spell's quality description.
	 */
	getSpellDisplayData() {
		if (this.type !== 'spell') {
			return false;
		}

		// Define constants and variables
		const hrZeroText = this.system.rollInfo?.useWeapon?.hrZero?.value ? `${game.i18n.localize('FU.HRZero')} +` : `${game.i18n.localize('FU.HighRollAbbr')} +`;

		const attackAttributes = [this.system.rollInfo?.attributes?.primary.value.toUpperCase(), this.system.rollInfo?.attributes?.secondary.value.toUpperCase()].join(' + ');

		const attackString = this.system.hasRoll.value ? `【${attackAttributes}${this.system.rollInfo.accuracy.value > 0 ? ` +${this.system.rollInfo.accuracy.value}` : ''}】` : '';

		const damageString = this.system.rollInfo.damage.hasDamage.value ? `【${hrZeroText} ${this.system.rollInfo.damage.value}】 ${this.system.rollInfo.damage.type.value}` : '';

		const qualText = this.system.quality?.value || '';
		const detailString = [attackString, damageString].filter(Boolean).join('⬥');
		const qualityString = [capitalizeFirst(this.system.cost.amount), capitalizeFirst(this.system.targeting.rule), capitalizeFirst(this.system.duration.value), qualText].filter(Boolean).join(' ⬥ ');

		return {
			attackString,
			damageString,
			detailString,
			qualityString,
		};
	}

	/**
	 * Get the display data for an item.
	 *
	 * @returns {object|boolean} An object containing item display information, or false if this is not an item.
	 * @property {string} qualityString - The item's summary.
	 */
	getItemDisplayData() {
		const relevantTypes = ['consumable', 'treasure', 'rule'];
		if (!relevantTypes.includes(this.type)) {
			return false;
		}

		// Retrieve and process the item's summary
		const summary = this.system.summary.value?.trim() || '';
		let qualityString = game.i18n.localize('FU.SummaryNone');

		// Parse the summary if it exists and is not empty
		if (summary) {
			const parser = new DOMParser();
			const doc = parser.parseFromString(summary, 'text/html');
			qualityString = doc.body.textContent || game.i18n.localize('FU.SummaryNone');
		}

		return {
			qualityString,
		};
	}

	/**
	 * Get the display data for an item.
	 *
	 * @returns {object|boolean} An object containing skill display information, or false if this is not a skill.
	 * @property {string} qualityString - The skill's description.
	 */
	getSkillDisplayData() {
		// Check if this item is not a skill
		if (this.type !== 'skill' && this.type !== 'miscAbility') {
			return false;
		}

		function translate(string) {
			const allTranslations = Object.assign({}, CONFIG.FU.attributeAbbreviations, CONFIG.FU.damageTypes);

			return game.i18n.localize(allTranslations?.[string] ?? string);
		}

		// Get the equipped item IDs from the actor's system
		const equipped = this.actor.system.equipped || {};
		const mainHandId = equipped.mainHand;

		// Find the main hand weapon by its ID
		let weaponMain = mainHandId ? this.actor.items.get(mainHandId) : null;

		const hasRoll = this.system.hasRoll?.value;
		const hasDamage = this.system.rollInfo?.damage?.hasDamage.value;
		const usesWeapons = this.system.rollInfo?.useWeapon?.accuracy.value;
		const usesWeaponsDamage = this.system.rollInfo?.useWeapon?.damage.value;
		const hrZeroText = this.system.rollInfo?.useWeapon?.hrZero.value ? `${game.i18n.localize('FU.HRZero')} +` : `${game.i18n.localize('FU.HighRollAbbr')} +`;

		let attackWeaponAttributes, attackAttributes;
		if (usesWeapons && weaponMain) {
			attackWeaponAttributes = [translate(weaponMain?.system?.attributes?.primary.value).toUpperCase(), translate(weaponMain?.system?.attributes?.secondary.value).toUpperCase()].join(' + ');
		} else {
			attackWeaponAttributes = '';
		}

		if (hasRoll) {
			attackAttributes = [translate(this.system?.rollInfo?.attributes?.primary.value).toUpperCase(), translate(this.system?.rollInfo?.attributes?.secondary.value).toUpperCase()].join(' + ');
		}

		const weaponString = usesWeapons ? (weaponMain ? weaponMain?.name : game.i18n.localize('FU.AbilityNoWeaponEquipped')) : '';

		let attackString = '';
		if (hasRoll || usesWeapons) {
			attackString = usesWeapons
				? `【${attackWeaponAttributes}】${weaponMain ? (weaponMain?.system?.accuracy?.value > 0 ? ` + ${weaponMain?.system?.accuracy?.value}` : '') : ''}`
				: `【${attackAttributes}】${this.system?.rollInfo?.accuracy?.value > 0 ? ` + ${this.system?.rollInfo?.accuracy?.value}` : ''}`;
		}

		let damageString = '';
		if (hasDamage || usesWeaponsDamage) {
			damageString = usesWeapons
				? `【${hrZeroText} ${weaponMain ? `${weaponMain?.system?.damage.value}】 ${translate(weaponMain?.system?.damageType.value)}` : ''}`
				: `【${hrZeroText} ${this.system?.rollInfo?.damage?.value > 0 ? ` ${this.system?.rollInfo?.damage?.value}` : '0'} 】${translate(this.system?.rollInfo?.damage.type.value)}`;
		}

		const qualityString = [capitalizeFirst(this.system?.class?.value), weaponString, attackString, damageString].filter(Boolean).join(' ⬥ ');

		const starCurrent = this.system?.level?.value;
		const starMax = this.system?.level?.max;

		return {
			qualityString: `${qualityString}`,
			starCurrent: `${starCurrent}`,
			starMax: `${starMax}`,
		};
	}

	/**
	 * @returns {ProgressDataModel}
	 * @remarks Returns clocks before resources
	 */
	getProgress() {
		// Search for legacy clock data among the data models
		if (this.system.hasClock && this.system.hasClock.value) {
			return this.system.progress;
		}
		if (this.system.hasResource && this.system.hasResource.value) {
			return this.system.rp;
		}
		// Search among active effects in the item
		for (const effect of this.effects.values()) {
			if (effect.system.rules.progress.enabled) {
				return effect.system.rules.progress;
			}
		}
		return null;
	}

	/**
	 * Handle clickable rolls.
	 * @param {KeyboardModifiers} modifiers
	 */
	async roll(modifiers = { shift: false, alt: false, ctrl: false, meta: false }) {
		if (this.system.showTitleCard?.value) {
			SOCKET.executeForEveryone('use', this.name);
		}

		return this.handleCheckV2(modifiers);
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<undefined>}
	 */
	async handleCheckV2(modifiers) {
		if (this.system.roll instanceof Function) {
			return this.system.roll(modifiers);
		} else {
			return ChecksV2.display(this.actor, this);
		}
	}

	applyActiveEffects() {
		const overrides = {};

		// Organize non-disabled effects by their application priority
		const changes = [];
		for (const effect of this.allApplicableEffects()) {
			if (!effect.active) continue;
			changes.push(
				...effect.changes.map((change) => {
					const c = foundry.utils.deepClone(change);
					c.effect = effect;
					c.order = c.priority ?? c.mode * 10;
					return c;
				}),
			);
		}
		changes.sort((a, b) => a.order - b.order);

		// Apply all changes
		for (let change of changes) {
			if (!change.key) continue;
			const changes = change.effect.apply(this, change);
			Object.assign(overrides, changes);
		}

		// Expand the set of final overrides
		this.overrides = foundry.utils.expandObject(overrides);
		this.render();
	}

	*allApplicableEffects() {
		for (const effect of this.effects) {
			// only yield effects that try to modify the item and not the actor
			if (effect.target === this) {
				yield effect;
			}
		}
	}

	/**
	 * Renders a dialog to confirm the FUID change and if accepted updates the FUID on the item.
	 * @returns {Promise<string|undefined>} The generated FUID or undefined if no change was made.
	 */
	async regenerateFUID() {
		const html = `
			<div class="warning-message">
			<p>${game.i18n.localize('FU.FUID.ChangeWarning2')}</p>
			<p>${game.i18n.localize('FU.FUID.ChangeWarning3')}</p>
			</div>
			`;

		const confirmation = await Dialog.confirm({
			title: game.i18n.localize('FU.FUID.Regenerate'),
			content: html,
			defaultYes: false,
			options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		});

		if (!confirmation) return;

		const fuid = slugify(this.name);
		await this.update({ 'system.fuid': fuid });

		return fuid;
	}

	get isEquipped() {
		if (this.actor) {
			return this.actor.system.equipped.isEquipped(this);
		}
		return false;
	}
}
