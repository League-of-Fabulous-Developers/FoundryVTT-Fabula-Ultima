import { FU } from '../../../helpers/config.mjs';
import { FUItem } from '../item.mjs';
import { CustomWeaponDataModel } from '../customWeapon/custom-weapon-data-model.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';

/*
Hoplosphere Changes:
- increase <attribute> die size ✔
- gain resistance to <type> ✔
- gain immunity to <type> ✔
- make weapon deal <type> damage ✔
- make <type> damage ignore resistances
- allow changing damage type to <type>
- deal extra damage to <species> ✔
- gain bonus to def/mdef ✔
- gain immunity to <status> ✔
- enemy hit suffers <status> ✔
- increase incoming <resource> recovery ✔
- make weapon ignore resistances
- make weapon ignore immunities
- gain bonus to accuracy checks ✔
- gain flat extra damage ✔
- weapon targets mdef ✔
- spells deal flat extra damage ✔
- spells have increased HP recovery
- "free text" quality ✔
- "rich text" quality
 */

/**
 * @typedef HoplosphereChangeDefinition
 * @property {string} label
 * @property {string, (() => string)} [effectLabel] descriptive label for the effect in readonly mode. defaults to label when not provided
 * @property {string} summary descriptive text for a configured effect, may be a localization key. defaults to label when not provided
 * @property {string} template
 * @property {object} templateData
 * @property {(item: FUItem, actor: FUActor) => void} apply "this" will be bound to a DataModel defined by "schema"
 * @property {() => DataSchema} defineSchema
 * @property {boolean} [weaponOnly] for chat display purposes
 * @property {(data: object) => void} prepareLocalization preprocess data for localization
 */
/**
 *
 * @type {Record<string, HoplosphereChangeDefinition>}
 */
const HOPLOSPHERE_CHANGE_TYPES = {
	increaseAttributeDieSize: {
		label: 'FU.HoplosphereEffectImproveAttribute',
		summary: 'FU.HoplosphereEffectImproveAttributeSummary',
		template: 'projectfu.hoplosphere.effectSingleChoice',
		templateData: () => ({
			label: 'FU.Attribute',
			name: 'attribute',
			choices: FU.attributes,
		}),
		defineSchema: () => ({
			attribute: new foundry.data.fields.StringField({ choices: Object.keys(FU.attributes), initial: 'dex' }),
		}),
		apply(item, actor) {
			if (actor) {
				actor.system.attributes[this.attribute].upgrade();
			}
		},
		prepareLocalization: (data) => {
			data.attribute = game.i18n.localize(FU.attributes[data.attribute]);
		},
	},
	gainResistance: {
		label: 'FU.HoplosphereEffectGainResistance',
		summary: 'FU.HoplosphereEffectGainResistanceSummary',
		template: 'projectfu.hoplosphere.effectSingleChoice',
		templateData: () => ({
			label: 'FU.DamageType',
			name: 'damageType',
			choices: FU.damageTypes,
		}),
		defineSchema: () => ({
			damageType: new foundry.data.fields.StringField({ choices: Object.keys(FU.damageTypes), initial: 'physical' }),
		}),
		apply(item, actor) {
			if (actor) {
				actor.system.affinities[this.damageType].resistance();
			}
		},
		prepareLocalization: (data) => {
			data.damageType = game.i18n.localize(FU.damageTypes[data.damageType]);
		},
	},
	gainImmunity: {
		label: 'FU.HoplosphereEffectGainImmunity',
		summary: 'FU.HoplosphereEffectGainImmunitySummary',
		template: 'projectfu.hoplosphere.effectSingleChoice',
		templateData: () => ({
			label: 'FU.DamageType',
			name: 'damageType',
			choices: FU.damageTypes,
		}),
		defineSchema: () => ({
			damageType: new foundry.data.fields.StringField({ choices: Object.keys(FU.damageTypes), initial: 'physical' }),
		}),
		apply(item, actor) {
			if (actor) {
				actor.system.affinities[this.damageType].immunity();
			}
		},
		prepareLocalization: (data) => {
			data.damageType = game.i18n.localize(FU.damageTypes[data.damageType]);
		},
	},
	changeWeaponDamageType: {
		label: 'FU.HoplosphereEffectChangeWeaponDamageType',
		summary: 'FU.HoplosphereEffectChangeWeaponDamageTypeSummary',
		template: 'projectfu.hoplosphere.effectSingleChoice',
		templateData: () => ({
			label: 'FU.DamageType',
			name: 'damageType',
			choices: FU.damageTypes,
		}),
		defineSchema: () => ({
			damageType: new foundry.data.fields.StringField({ choices: Object.keys(FU.damageTypes), initial: 'physical' }),
		}),
		weaponOnly: true,
		apply(item, actor) {
			if (item.system instanceof CustomWeaponDataModel) {
				item.system.primaryForm.damage.type = this.damageType;
				item.system.secondaryForm.damage.type = this.damageType;
				foundry.utils.setProperty(item.overrides, 'system.primaryForm.damage.type', this.damageType);
				foundry.utils.setProperty(item.overrides, 'system.secondaryForm.damage.type', this.damageType);
			}
		},
		prepareLocalization: (data) => {
			data.damageType = game.i18n.localize(FU.damageTypes[data.damageType]);
		},
	},
	addExtraDamageToSpecies: {
		label: 'FU.HoplosphereEffectAddExtraDamageToSpecies',
		summary: 'FU.HoplosphereEffectAddExtraDamageToSpeciesSummary',
		template: 'projectfu.hoplosphere.effectChoiceAndAmount',
		templateData: () => ({
			choice: {
				label: 'FU.Species',
				name: 'species',
				choices: FU.species,
			},
			amount: {
				label: 'FU.Amount',
				name: 'amount',
			},
		}),
		defineSchema: () => ({
			species: new foundry.data.fields.StringField({ choices: Object.keys(FU.species), initial: 'beast' }),
			amount: new foundry.data.fields.NumberField({ nullable: false, integer: true, initial: 2 }),
		}),
		apply(item, actor) {
			if (actor) {
				const newValue = (actor.system.bonuses.damage[this.species] += this.amount);
				foundry.utils.setProperty(actor.overrides, `system.bonuses.damage.${this.species}`, newValue);
			}
		},
		prepareLocalization: (data) => {
			data.species = game.i18n.localize(FU.species[data.species]);
		},
	},
	increaseDefense: {
		label: 'FU.HoplosphereEffectIncreaseDefense',
		summary: 'FU.HoplosphereEffectIncreaseDefenseSummary',
		template: 'projectfu.hoplosphere.effectChoiceAndAmount',
		templateData: () => ({
			choice: {
				label: 'FU.Defense',
				name: 'defense',
				choices: Object.fromEntries(Object.entries(FU.defenses).map(([key, value]) => [key, value.name])),
			},
			amount: {
				label: 'FU.Amount',
				name: 'amount',
			},
		}),
		defineSchema: () => ({
			defense: new foundry.data.fields.StringField({ choices: Object.keys(FU.defenses), initial: 'def' }),
			amount: new foundry.data.fields.NumberField({ nullable: false, integer: true, initial: 1 }),
		}),
		apply(item, actor) {
			if (actor) {
				const newValue = (actor.system.derived[this.defense].bonus += this.amount);
				foundry.utils.setProperty(actor.overrides, `system.derived.${this.defense}.bonus`, newValue);
			}
		},
		prepareLocalization: (data) => {
			data.defense = game.i18n.localize(FU.defenses[data.defense].abbr);
		},
	},
	gainStatusImmunity: {
		label: 'FU.HoplosphereEffectGainStatusImmunity',
		summary: 'FU.HoplosphereEffectGainStatusImmunitySummary',
		template: 'projectfu.hoplosphere.effectSingleChoice',
		templateData: () => ({
			label: 'FU.StatusEffect',
			name: 'status',
			choices: FU.temporaryEffects,
		}),
		defineSchema: () => ({
			status: new foundry.data.fields.StringField({ choices: Object.keys(FU.temporaryEffects), initial: 'dazed' }),
		}),
		apply(item, actor) {
			if (actor) {
				actor.system.immunities[this.status].base = true;
				foundry.utils.setProperty(actor.overrides, `actor.system.immunities.${this.status}.base`, true);
			}
		},
		prepareLocalization: (data) => {
			data.status = game.i18n.localize(FU.temporaryEffects[data.status]);
		},
	},
	hitsCauseStatus: {
		label: 'FU.HoplosphereEffectHitsCauseStatus',
		summary: 'FU.HoplosphereEffectHitsCauseStatusSummary',
		template: 'projectfu.hoplosphere.effectSingleChoice',
		templateData: () => ({
			label: 'FU.StatusEffect',
			name: 'status',
			choices: FU.temporaryEffects,
		}),
		defineSchema: () => ({
			status: new foundry.data.fields.StringField({ choices: Object.keys(FU.temporaryEffects), initial: 'dazed' }),
		}),
		weaponOnly: true,
		prepareLocalization: (data) => {
			data.status = game.i18n.localize(FU.temporaryEffects[data.status]);
		},
	},
	increaseResourceRecovery: {
		label: 'FU.HoplosphereEffectIncreaseResourceRecovery',
		summary: 'FU.HoplosphereEffectIncreaseResourceRecoverySummary',
		template: 'projectfu.hoplosphere.effectChoiceAndAmount',
		templateData: () => ({
			choice: {
				label: 'FU.Resource',
				name: 'resource',
				choices: Object.fromEntries(Object.entries(FU.resources).filter(([key]) => ['hp', 'mp', 'ip'].includes(key))),
			},
			amount: {
				label: 'FU.Amount',
				name: 'amount',
			},
		}),
		defineSchema: () => ({
			resource: new foundry.data.fields.StringField({ choices: ['hp', 'mp', 'ip'], initial: 'hp' }),
			amount: new foundry.data.fields.NumberField({ nullable: false, integer: true, initial: 2 }),
		}),
		apply(item, actor) {
			if (actor) {
				const newValue = (actor.system.bonuses.incomingRecovery[this.resource] += this.amount);
				foundry.utils.setProperty(actor.overrides, `system.bonuses.incomingRecovery.${this.resource}`, newValue);
			}
		},
		prepareLocalization: (data) => {
			data.resource = game.i18n.localize(FU.resources[data.resource]);
		},
	},
	gainCheckBonus: {
		label: 'FU.HoplosphereEffectGainCheckBonus',
		summary: 'FU.HoplosphereEffectGainCheckBonusSummary',
		template: 'projectfu.hoplosphere.effectChoiceAndAmount',
		templateData: () => ({
			choice: {
				label: 'FU.HoplosphereEffectGainCheckBonusLabelCheckType',
				name: 'checkType',
				choices: {
					accuracyCheck: 'FU.AccuracyCheck',
					magicCheck: 'FU.MagicCheck',
					initiativeCheck: 'FU.InitiativeCheck',
				},
			},
			amount: {
				label: 'FU.Amount',
				name: 'amount',
			},
		}),
		defineSchema: () => ({
			checkType: new foundry.data.fields.StringField({ choices: ['accuracyCheck', 'magicCheck', 'initiativeCheck'], initial: 'accuracyCheck' }),
			amount: new foundry.data.fields.NumberField({ nullable: false, integer: true, initial: 1 }),
		}),
		apply(item, actor) {
			if (actor) {
				if (this.checkType === 'initiativeCheck') {
					const newValue = (actor.system.derived.init.bonus += this.amount);
					foundry.utils.setProperty(actor.overrides, 'system.derived.init.bonus', newValue);
				} else {
					const newValue = (actor.system.bonuses.accuracy[this.checkType] += this.amount);
					foundry.utils.setProperty(actor.overrides, `system.bonuses.accuracy.${this.checkType}`, newValue);
				}
			}
		},
		prepareLocalization: (data) => {
			if (data.checkType === 'accuracyCheck') {
				data.checkType = game.i18n.localize(FU.checkTypes.accuracy);
			}
			if (data.checkType === 'magicCheck') {
				data.checkType = game.i18n.localize(FU.checkTypes.magic);
			}
			if (data.checkType === 'initiativeCheck') {
				data.checkType = game.i18n.localize(FU.checkTypes.initiative);
			}
		},
	},
	increaseWeaponDamage: {
		label: 'FU.HoplosphereEffectIncreaseWeaponDamage',
		summary: 'FU.HoplosphereEffectIncreaseWeaponDamageSummary',
		template: 'projectfu.hoplosphere.effectAmount',
		templateData: () => ({
			label: 'FU.Amount',
			name: 'amount',
		}),
		defineSchema: () => ({
			amount: new foundry.data.fields.NumberField({ nullable: false, integer: true, initial: 2 }),
		}),
		weaponOnly: true,
		apply(item, actor) {
			if (item.system instanceof CustomWeaponDataModel) {
				for (let key of ['primaryForm', 'secondaryForm']) {
					const newValue = (item.system[key].damage.value += this.amount);
					foundry.utils.setProperty(item.overrides, `system.${key}.damage.value`, newValue);
				}
			}
		},
	},
	targetMagicDefense: {
		label: 'FU.HoplosphereEffectTargetMagicDefense',
		summary: 'FU.HoplosphereEffectTargetMagicDefenseSummary',
		template: 'projectfu.hoplosphere.notification',
		templateData: () => ({
			label: 'FU.HoplosphereEffectTargetMagicDefense',
			text: 'FU.HoplosphereEffectTargetMagicDefenseSummary',
		}),
		weaponOnly: true,
		apply(item, actor) {
			if (item.system instanceof CustomWeaponDataModel) {
				const newValue = (item.system.defense = 'mdef');
				foundry.utils.setProperty(item.overrides, `system.defense`, newValue);
			}
		},
	},
	increaseSpellDamage: {
		label: 'FU.HoplosphereEffectIncreaseSpellDamage',
		summary: 'FU.HoplosphereEffectIncreaseSpellDamageSummary',
		template: 'projectfu.hoplosphere.effectAmount',
		templateData: () => ({
			label: 'FU.Amount',
			name: 'amount',
		}),
		defineSchema: () => ({
			amount: new foundry.data.fields.NumberField({ nullable: false, integer: true, initial: 2 }),
		}),
		apply(item, actor) {
			if (actor) {
				const newValue = (actor.system.bonuses.damage.spell += this.amount);
				foundry.utils.setProperty(actor.overrides, `system.bonuses.damage.spell`, newValue);
			}
		},
	},
	freeText: {
		label: 'FU.HoplosphereEffectFreeText',
		summary: '{text}',
		template: 'projectfu.hoplosphere.freeText',
		templateData() {
			return {
				name: {
					label: 'FU.Name',
					name: 'name',
				},
				text: {
					label: 'FU.Description',
					name: 'text',
				},
			};
		},
		defineSchema: () => ({
			name: new foundry.data.fields.StringField({ initial: () => game.i18n.localize('FU.HoplosphereEffectFreeTextDefaultName'), blank: true }),
			text: new foundry.data.fields.StringField({ blank: true }),
		}),
		effectLabel() {
			return this.name;
		},
	},
};

const HOPLOSPHERE_CHANGE_DATA_MODELS = Object.fromEntries(
	Object.entries(HOPLOSPHERE_CHANGE_TYPES).map(([key, { apply, defineSchema, template, templateData, label, summary, effectLabel, prepareLocalization, weaponOnly }]) => {
		const ChangeDataModel = class extends foundry.abstract.DataModel {
			static defineSchema() {
				const { StringField, NumberField } = foundry.data.fields;
				return {
					...(defineSchema ? defineSchema() : {}),
					type: new StringField({
						required: true,
						blank: false,
						initial: this.type,
						validate: (value) => value === this.type,
						validationError: `must be equal to "${this.type}"`,
					}),
					coagulationLevel: new NumberField({ initial: 1, min: 1, max: 4 }),
				};
			}

			static get type() {
				return key;
			}

			static get label() {
				return label;
			}

			get label() {
				return this.constructor.label;
			}

			static get template() {
				return template;
			}

			get template() {
				return this.constructor.template;
			}

			#templateData = templateData.bind(this);

			get templateData() {
				return this.#templateData();
			}

			#apply = apply ? apply.bind(this) : () => {};

			apply(item, actor) {
				this.#apply(item, actor);
			}

			prepareLocalization() {
				const data = { ...this };
				if (prepareLocalization) {
					prepareLocalization.call(this, data);
				}
				return data;
			}

			get effectLabel() {
				let lbl = effectLabel ?? label;
				if (lbl instanceof Function) {
					lbl = lbl.call(this);
				}
				return game.i18n.format(lbl, this.prepareLocalization());
			}

			get summary() {
				return game.i18n.format(summary ?? label, this.prepareLocalization());
			}

			get weaponOnly() {
				return weaponOnly ?? false;
			}
		};

		return [key, ChangeDataModel];
	}),
);

/**
 * @typedef HoplosphereChangeData
 * @property {string} type
 * @property {number} coagulationLevel
 * @property {(item: FUItem, actor: FUActor) => void} apply "this" will be bound to a DataModel defined by "schema"
 */

/**
 * @property {string} fuid
 * @property {string} source
 * @property {string} summary
 * @property {'all', 'weapon'} socketable
 * @property {boolean} socketed
 * @property {1, 2} requiredSlots
 * @property {HoplosphereChangeData[]} effects
 */
export class HoplosphereDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { StringField, ArrayField, NumberField, TypedSchemaField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			source: new StringField({ initial: '', blank: true }),
			summary: new StringField({ initial: '', blank: true }),
			socketable: new StringField({ initial: 'all', options: ['all', 'weapon'] }),
			requiredSlots: new NumberField({ initial: 1, choices: [1, 2] }),
			effects: new ArrayField(new TypedSchemaField(HOPLOSPHERE_CHANGE_DATA_MODELS)),
		};
	}

	static get availableChangeTypes() {
		return Object.values(HOPLOSPHERE_CHANGE_DATA_MODELS);
	}

	#coagLevel = 0;

	get coagLevel() {
		return this.#coagLevel;
	}

	prepareBaseData() {
		this.#coagLevel = 0;
	}

	prepareDerivedData() {
		const parentItem = this.parent.parentDocument;
		this.socketed = this.parent.isEmbedded && parentItem instanceof FUItem;
		this.activeEffects = [];
		if (this.socketed) {
			const embeddedItems = parentItem.getEmbeddedCollection(this.parent.parentCollection);
			const similarHoplospheres = embeddedItems.filter((item) => this.#isSimilarHoplosphere(item));
			this.#coagLevel = similarHoplospheres.length;
			this.activeEffects = this.effects
				.filter((effect) => effect.coagulationLevel <= this.coagLevel)
				.filter((effect) => {
					if (effect.weaponOnly) {
						return parentItem.system instanceof CustomWeaponDataModel;
					} else {
						return true;
					}
				})
				.sort((a, b) => a.coagulationLevel - b.coagulationLevel);
			console.log(this.coagLevel, this.activeEffects);
		}
	}

	afterApplyActiveEffects() {
		const parentItem = this.parent.parentDocument;
		if (!this.socketed || !(parentItem.system.transferEffects ? parentItem.system.transferEffects() : true)) return;

		if (parentItem && parentItem instanceof FUItem) {
			this.activeEffects.forEach((effect) => effect.apply(parentItem, parentItem.actor));
		}
	}

	async addEffect() {
		const effects = this.parent.toObject(false).system.effects;
		effects.push({ type: Object.keys(HOPLOSPHERE_CHANGE_DATA_MODELS)[0] });
		return this.parent.update({ 'system.effects': effects });
	}

	async removeEffect(index) {
		const effects = this.toObject(true).effects;
		effects.splice(index, 1);
		return await this.parent.update({ 'system.effects': effects });
	}

	/**
	 * @param {Item} item
	 * @returns {boolean}
	 */
	#isSimilarHoplosphere(item) {
		return item.system instanceof HoplosphereDataModel && item.system.fuid === this.fuid;
	}
}

/** @type {RenderCheckHook} */
const onRenderDisplay = (sections, check, actor, item, additionalFlags) => {
	if (check.type === 'display' && item?.type === 'hoplosphere') {
		CommonSections.genericText(
			sections,
			foundry.applications.handlebars.renderTemplate('projectfu.hoplosphere.displayEffects', {
				effects: item.system.effects.map((effect) => ({
					name: effect.effectLabel,
					summary: effect.summary,
					coagulationLevel: effect.coagulationLevel,
				})),
			}),
		);
	}
};

Hooks.on(CheckHooks.renderCheck, onRenderDisplay);
