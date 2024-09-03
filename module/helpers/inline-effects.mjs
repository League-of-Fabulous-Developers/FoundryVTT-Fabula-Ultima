import { statusEffects } from './statuses.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';
import { Flags } from './flags.mjs';
import { FU, SYSTEM } from './config.mjs';
import { FUActiveEffect } from '../documents/effects/active-effect.mjs';
import { toggleStatusEffect } from './effects.mjs';
import { targetHandler } from './target-handler.mjs';

const INLINE_EFFECT = 'InlineEffect';
const INLINE_EFFECT_CLASS = 'inline-effect';

const SUPPORTED_STATUSES = ['dazed', 'enraged', 'poisoned', 'shaken', 'slow', 'weak'];
const BOONS_AND_BANES = ['dex-up', 'ins-up', 'mig-up', 'wlp-up', 'dex-down', 'ins-down', 'mig-down', 'wlp-down', 'guard', 'cover', 'aura', 'barrier', 'flying', 'provoked'];

const enricher = {
	pattern: /@EFFECT\[([a-zA-Z0-9+/-]+={0,3})]/g,
	enricher: inlineEffectEnricher,
};

function createEffectAnchor(effect) {
	const anchor = document.createElement('a');
	anchor.draggable = true;
	anchor.dataset.effect = toBase64(effect);
	anchor.classList.add('inline', INLINE_EFFECT_CLASS, 'disable-how-to');
	const icon = document.createElement('i');
	icon.classList.add('fun', 'fu-aura');
	anchor.append(icon);
	anchor.append(effect.name);
	return anchor;
}

function createBrokenAnchor() {
	const anchor = document.createElement('a');
	anchor.classList.add('inline', 'broken');
	const icon = document.createElement('i');
	icon.classList.add('fas', 'fa-chain-broken');
	anchor.append(icon);
	anchor.append(game.i18n.localize('FU.InlineEffectInvalid'));
	return anchor;
}

function createStatusAnchor(effectValue, status) {
	const anchor = document.createElement('a');
	anchor.draggable = true;
	anchor.dataset.status = effectValue;
	anchor.classList.add('inline', INLINE_EFFECT_CLASS, 'disable-how-to');
	const icon = document.createElement('i');
	icon.classList.add('fun', 'fu-aura');
	anchor.append(icon);
	anchor.append(game.i18n.localize(status.name));
	return anchor;
}

/**
 * @param text
 * @param options
 */
function inlineEffectEnricher(text, options) {
	/** @type string */
	const effectValue = text[1];

	if (SUPPORTED_STATUSES.includes(effectValue) || BOONS_AND_BANES.includes(effectValue)) {
		const status = statusEffects.find((value) => value.id === effectValue);
		if (status) {
			return createStatusAnchor(effectValue, status);
		}
	} else {
		const decodedEffect = fromBase64(effectValue);
		if (decodedEffect && decodedEffect.name && decodedEffect.changes) {
			return createEffectAnchor(decodedEffect);
		}
	}

	return createBrokenAnchor();
}

/**
 * @param {ClientDocument} document
 * @param {HTMLElement} element - The target HTML element associated with the event.
 * @returns {string|null}
 */
function determineSource(document, element) {
	if (document instanceof FUActor) {
		const itemId = $(element).closest('[data-item-id]').data('itemId'); // Changed event.target to element
		return itemId ? document.items.get(itemId).uuid : document.uuid;
	} else if (document instanceof FUItem) {
		return document.uuid;
	} else if (document instanceof ChatMessage) {
		const speakerActor = ChatMessage.getSpeakerActor(document.speaker);
		const flagItem = document.getFlag(SYSTEM, Flags.ChatMessage.Item);
		if (flagItem && speakerActor) {
			const item = speakerActor.items.get(flagItem._id);
			return item ? item.uuid : null;
		}
		if (speakerActor) {
			return speakerActor.uuid;
		}
	}
	return null;
}

/**
 * @param {ClientDocument} document
 * @param {jQuery} html
 */
function activateListeners(document, html) {
	if (document instanceof DocumentSheet) {
		document = document.document;
	}

	html.find('a.inline.inline-effect[draggable]')
		.on('click', async function () {
			const source = determineSource(document, this);
			const effectData = fromBase64(this.dataset.effect);
			const status = this.dataset.status;
			let targets = await targetHandler();
			if (targets.length > 0) {
				if (effectData) {
					targets.forEach((actor) => onApplyEffectToActor(actor, source, effectData));
				} else if (status) {
					targets.forEach((actor) => {
						if (!actor.statuses.has(status)) {
							toggleStatusEffect(actor, status, source);
						}
					});
				}
			}
		})
		.on('dragstart', function (event) {
			/** @type DragEvent */
			event = event.originalEvent;
			if (!(event.target instanceof HTMLElement) || !event.dataTransfer) {
				return;
			}
			const source = determineSource(document, this);

			const data = {
				type: INLINE_EFFECT,
				source: source,
				effect: fromBase64(this.dataset.effect),
				status: this.dataset.status,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		})
		.on('contextmenu', function (event) {
			event.preventDefault();
			event.stopPropagation();
			let effectData;
			if (this.dataset.status) {
				const status = this.dataset.status;
				const statusEffect = CONFIG.statusEffects.find((value) => value.id === status);
				if (statusEffect) {
					effectData = { ...statusEffect, statuses: [status] };
				}
			} else {
				effectData = fromBase64(this.dataset.effect);
			}
			if (effectData) {
				effectData.origin = determineSource(document, this);
				const cls = getDocumentClass('ActiveEffect');
				delete effectData.id;
				cls.migrateDataSafe(effectData);
				cls.cleanData(effectData);
				Actor.create({ name: 'Temp Actor', type: 'character' }, { temporary: true })
					.then((value) => {
						return cls.create(effectData, { temporary: true, render: true, parent: value });
					})
					.then((value) => {
						const activeEffectConfig = new ActiveEffectConfig(value);
						activeEffectConfig.render(true, { editable: false });
					});
			}
		});
}

function onApplyEffectToActor(actor, source, effect) {
	if (actor) {
		ActiveEffect.create(
			{
				...effect,
				origin: source,
				flags: foundry.utils.mergeObject(effect.flags ?? {}, { [SYSTEM]: { [FUActiveEffect.TEMPORARY_FLAG]: true } }),
			},
			{ parent: actor },
		);
	}
}

function onDropActor(actor, sheet, { type, source, effect, status }) {
	if (type === INLINE_EFFECT) {
		if (status) {
			if (!actor.statuses.has(status)) {
				toggleStatusEffect(actor, status, source);
			}
		} else if (effect) {
			ActiveEffect.create(
				{
					...effect,
					origin: source,
					flags: foundry.utils.mergeObject(effect.flags ?? {}, { [SYSTEM]: { [FUActiveEffect.TEMPORARY_FLAG]: true } }),
				},
				{ parent: actor },
			);
		}
		return false;
	}
}

function toBase64(value) {
	try {
		const string = JSON.stringify(value);
		const bytes = new TextEncoder().encode(string);
		const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
		return btoa(binString);
	} catch (e) {
		return null;
	}
}

function fromBase64(base64) {
	try {
		const binString = atob(base64);
		const uint8Array = Uint8Array.from(binString, (m) => m.codePointAt(0));
		const decodedValue = new TextDecoder().decode(uint8Array);
		return JSON.parse(decodedValue);
	} catch (e) {
		return null;
	}
}

function showEffectConfiguration(state, dispatch, view, ...rest) {
	new InlineEffectConfiguration(state, dispatch).render(true);
}

function initialize() {
	CONFIG.TextEditor.enrichers.push(enricher);
	Hooks.on('renderChatMessage', activateListeners);
	Hooks.on('renderApplication', activateListeners);
	Hooks.on('renderActorSheet', activateListeners);
	Hooks.on('renderItemSheet', activateListeners);
	Hooks.on('dropActorSheetData', onDropActor);
}

export const InlineEffects = {
	showEffectConfiguration,
	initialize,
};

/**
 * @typedef InlineEffectConfig
 * @property {"status", "boonOrBane", "custom"} type
 * @property {'dazed', 'enraged', 'poisoned', 'shaken', 'slow', 'weak'} status
 * @property {GuidedInlineEffectConfig} guided
 */

/**
 * @typedef GuidedInlineEffectConfig
 * @property {string} name
 * @property {string} icon
 * @property {string} description
 * @property {Object[]} changes
 */

/*
possible changes from official effects:
- improve attributes (custom) ✔
- cap attribute (downgrade) ✔
- grant extra damage (add) -> missing generic damage ✔
- improve accuracy (add) -> missing generic accuracy ✔
- upgrade def/mdef (upgrade) ✔
- grant resistance (custom) ✔
- apply vulnerability (custom) ✔
- grant immunity (upgrade) ✔
- grant absorption (custom) ✔
- grant status immunity (override) ✔
- change attack damage type (override)
- grant additional actions (add) -> missing data field
- lower crit threshold (override) -> not yet supported
 */
/**
 * @typedef GuidedInlineEffectChangeTemplate
 * @property {string} label
 * @property {string} template
 * @property {Object} [templateData]
 * @property {(Object) => EffectChangeData | EffectChangeData[]} toChange
 */

const damageTypes = (({ untyped, ...rest }) => rest)(FU.damageTypes);
const temporaryEffects = (({ ...rest }) => rest)(FU.temporaryEffects);

/**
 *
 * @type {Record<string, GuidedInlineEffectChangeTemplate>}
 */
const SUPPORTED_CHANGE_TYPES = {
	improveAttribute: {
		label: 'FU.InlineEffectConfigImproveAttribute',
		template: 'systems/projectfu/templates/app/partials/inline-effect-config-modify-attribute.hbs',
		templateData: {
			attributes: FU.attributes,
		},
		toChange: ({ attribute }) => ({
			key: `system.attributes.${attribute}`,
			mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
			value: 'upgrade',
		}),
	},
	capAttribute: {
		label: 'FU.InlineEffectConfigCapAttribute',
		template: 'systems/projectfu/templates/app/partials/inline-effect-config-modify-attribute.hbs',
		templateData: {
			attributes: FU.attributes,
		},
		toChange: ({ attribute }) => ({
			key: `system.attributes.${attribute}.current`,
			mode: CONST.ACTIVE_EFFECT_MODES.DOWNGRADE,
			value: `@system.attributes.${attribute}.base`,
		}),
	},
	damage: {
		label: 'FU.InlineEffectConfigModifyDamageBonuses',
		template: 'systems/projectfu/templates/app/partials/inline-effect-config-modify-damage-bonuses.hbs',
		templateData: {
			types: {
				all: 'FU.InlineEffectConfigModifyDamageBonusesTypeAll',
				melee: 'FU.InlineEffectConfigModifyDamageBonusesTypeMelee',
				ranged: 'FU.InlineEffectConfigModifyDamageBonusesTypeRanged',
				spell: 'FU.InlineEffectConfigModifyDamageBonusesTypeSpells',
			},
		},
		toChange: ({ damageType, value }) => {
			const createChange = (type, value) => ({
				key: `system.bonuses.damage.${type}`,
				mode: CONST.ACTIVE_EFFECT_MODES.ADD,
				value,
			});
			if (damageType === 'all') {
				return [createChange('melee', value), createChange('ranged', value), createChange('spell', value)];
			}
			return createChange(damageType, value);
		},
	},
	accuracy: {
		label: 'FU.InlineEffectConfigModifyAccuracy',
		template: 'systems/projectfu/templates/app/partials/inline-effect-config-modify-accuracy.hbs',
		templateData: {
			checks: {
				accuracyAndMagic: 'FU.InlineEffectConfigModifyAccuracyChecksAll',
				accuracyCheck: 'FU.InlineEffectConfigModifyAccuracyChecksAccuracy',
				magicCheck: 'FU.InlineEffectConfigModifyAccuracyChecksMagic',
				openCheck: 'FU.InlineEffectConfigModifyAccuracyOpenChecks',
			},
		},
		toChange: ({ check, value }) => {
			const createChange = (check, value) => ({
				key: `system.bonuses.accuracy.${check}`,
				mode: CONST.ACTIVE_EFFECT_MODES.ADD,
				value,
			});

			if (check === 'accuracyAndMagic') {
				return [createChange('accuracyCheck', value), createChange('magicCheck', value)];
			}
			return createChange(check, value);
		},
	},
	improveDefenses: {
		label: 'FU.InlineEffectConfigBuffDefenses',
		template: 'systems/projectfu/templates/app/partials/inline-effect-config-modify-defenses.hbs',
		templateData: {
			defenses: FU.defenses,
		},
		toChange: ({ defense, value }) => ({
			key: `system.derived.${defense}.value`,
			mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
			value: value,
		}),
	},
	vulnerability: {
		label: 'FU.InlineEffectConfigApplyVulnerability',
		template: 'systems/projectfu/templates/app/partials/inline-effect-config-modify-affinity.hbs',
		templateData: {
			damageTypes: damageTypes,
		},
		toChange: ({ damageType }) => ({
			key: `system.affinities.${damageType}`,
			mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
			value: 'downgrade',
		}),
	},
	resistance: {
		label: 'FU.InlineEffectConfigGrantResistance',
		template: 'systems/projectfu/templates/app/partials/inline-effect-config-modify-affinity.hbs',
		templateData: {
			damageTypes: damageTypes,
		},
		toChange: ({ damageType }) => ({
			key: `system.affinities.${damageType}`,
			mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
			value: 'upgrade',
		}),
	},
	immunity: {
		label: 'FU.InlineEffectConfigGrantImmunity',
		template: 'systems/projectfu/templates/app/partials/inline-effect-config-modify-affinity.hbs',
		templateData: {
			damageTypes: damageTypes,
		},
		toChange: ({ damageType }) => ({
			key: `system.affinities.${damageType}.current`,
			mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
			value: String(FU.affValue.immunity),
		}),
	},
	absorption: {
		label: 'FU.InlineEffectConfigGrantAbsorption',
		template: 'systems/projectfu/templates/app/partials/inline-effect-config-modify-affinity.hbs',
		templateData: {
			damageTypes: damageTypes,
		},
		toChange: ({ damageType }) => ({
			key: `system.affinities.${damageType}.current`,
			mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
			value: String(FU.affValue.absorption),
		}),
	},
	immunityStatus: {
		label: 'FU.InlineEffectConfigGrantStatusEffectImmunity',
		template: 'systems/projectfu/templates/app/partials/inline-effect-config-modify-status-effects.hbs',
		templateData: {
			temporaryEffects: temporaryEffects,
		},
		toChange: ({ temporaryEffect }) => ({
			key: `system.immunities.${temporaryEffect}.base`,
			mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			value: true,
		}),
	},
};

class InlineEffectConfiguration extends FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['form', 'sheet', 'projectfu'],
			resizable: true,
			height: 'auto',
			closeOnSubmit: false,
			editable: true,
			sheetConfig: false,
			submitOnChange: true,
			submitOnClose: true,
		});
	}

	#defaultIcon = '/icons/svg/aura.svg';
	#defaultName = game.i18n.localize('FU.NewEffect');

	#state;
	#dispatch;

	constructor(state, dispatch) {
		super({ type: 'status' }, { title: game.i18n.localize('FU.InlineEffectConfig') });
		this.#state = state;
		this.#dispatch = dispatch;
	}

	get template() {
		return 'systems/projectfu/templates/app/inline-effect-config.hbs';
	}

	getData(options = {}) {
		return {
			data: this.object,
			effectTypes: {
				status: 'FU.InlineEffectTypeStatus',
				boonOrBane: 'FU.InlineEffectTypeBoonOrBane',
				guided: 'FU.InlineEffectTypeGuided',
				custom: 'FU.InlineEffectTypeCustom',
			},
			statuses: Object.entries(FU.statusEffects)
				.filter(([key]) => SUPPORTED_STATUSES.includes(key))
				.reduce((agg, [key, value]) => (agg[key] = value) && agg, {}),
			boonsAndBanes: Object.entries(FU.statusEffects)
				.filter(([key]) => BOONS_AND_BANES.includes(key))
				.reduce((agg, [key, value]) => (agg[key] = value) && agg, {}),
			changeTypes: SUPPORTED_CHANGE_TYPES,
			defaultIcon: this.#defaultIcon,
			defaultName: this.#defaultName,
		};
	}

	async _updateObject(event, formData) {
		formData = foundry.utils.expandObject(formData);
		if (formData.type === 'guided' && formData.type !== this.object.type) {
			formData.guided ??= { changes: [{ type: Object.keys(SUPPORTED_CHANGE_TYPES).at(0) }] };
		}
		this.object = formData;
		if (this.object?.guided?.changes) {
			this.object.guided.changes = Array.from(Object.values(this.object.guided.changes));
		}
		this.render();
	}

	activateListeners(html) {
		html.find('img[data-edit]').on('click', this.#onEditImage.bind(this));
		html.find('.change-controls .change-control[data-action]').click(this.#onChangeControl.bind(this));
		html.find('button[data-action=finish]').click(this.#onFinish.bind(this));
		return super.activateListeners(html);
	}

	#onEditImage(event) {
		const attr = event.currentTarget.dataset.edit;
		const current = foundry.utils.getProperty(this.object, attr);
		const fp = new FilePicker({
			current,
			type: 'image',
			redirectToRoot: [this.#defaultIcon],
			callback: (path) => {
				event.currentTarget.src = path;
				if (this.options.submitOnChange) {
					return this._onSubmit(event);
				}
			},
			top: this.position.top + 40,
			left: this.position.left + 10,
		});
		return fp.browse();
	}

	#onChangeControl(event) {
		const action = event.currentTarget.dataset.action;
		switch (action) {
			case 'add': {
				const idx = this.object?.guided?.changes?.length ?? 0;
				return this.submit({
					updateData: {
						[`guided.changes.${idx}`]: { type: Object.keys(SUPPORTED_CHANGE_TYPES).at(0) },
					},
				});
			}
			case 'delete':
				event.currentTarget.closest('.change').remove();
				return this.submit().then(() => this.render());
		}
	}

	#onFinish(event) {
		this.close({ finish: true });
	}

	async close(options = {}) {
		await super.close(options);
		if (options.finish) {
			if (['status', 'boonOrBane'].includes(this.object.type)) {
				this.#dispatch(this.#state.tr.insertText(` @EFFECT[${this.object.status}] `));
			}
			if (this.object.type === 'guided') {
				const effectData = { ...this.object.guided };
				effectData.changes = (effectData.changes ?? []).flatMap((value) => SUPPORTED_CHANGE_TYPES[value.type].toChange(value));
				const encodedEffect = toBase64(effectData);
				this.#dispatch(this.#state.tr.insertText(` @EFFECT[${encodedEffect}] `));
			}
			if (this.object.type === 'custom') {
				const cls = getDocumentClass('ActiveEffect');
				const tempActor = await Actor.create({ name: 'Temp Actor', type: 'character' }, { temporary: true });
				const tempEffect = await cls.create(
					{
						_id: foundry.utils.randomID(),
						name: game.i18n.localize(this.#defaultName),
						icon: this.#defaultIcon,
					},
					{ temporary: true, parent: tempActor },
				);
				const activeEffectConfig = new TempActiveEffectConfig(tempEffect);
				activeEffectConfig.render(true);
				const dispatch = this.#dispatch;
				const state = this.#state;
				const hookRef = Hooks.on('closeActiveEffectConfig', function (sheet) {
					if (sheet === activeEffectConfig) {
						Hooks.off('closeActiveEffectConfig', hookRef);
						if (sheet.wasSubmitted) {
							const effectData = sheet.document.toObject();
							delete effectData._id;
							const encodedEffect = toBase64(effectData);
							dispatch(state.tr.insertText(` @EFFECT[${encodedEffect}] `));
						}
					}
				});
			}
		}
	}
}

class TempActiveEffectConfig extends ActiveEffectConfig {
	async _updateObject(event, formData) {
		this.object.updateSource(formData);
		return this.render();
	}

	async close(options = {}) {
		if (options.force) {
			this.wasSubmitted = true;
		}
		return super.close(options);
	}
}
