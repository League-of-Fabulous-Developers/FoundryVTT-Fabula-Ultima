import { PseudoDocument } from './pseudo-document.mjs';
import { SYSTEM } from '../../helpers/config.mjs';
import { FUActiveEffect } from '../effects/active-effect.mjs';
import { FUActor } from '../actors/actor.mjs';
import { PseudoItem } from './pseudo-item.mjs';
import { ExpressionContext, Expressions } from '../../expressions/expressions.mjs';

export class PseudoActiveEffect extends PseudoDocument {
	static documentName = 'ActiveEffect';

	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			_id: new fields.DocumentIdField(),
			name: new fields.StringField({ initial: () => game.i18n.format('DOCUMENT.New', { type: game.i18n.localize(this.metadata.label) }), required: true, blank: false, label: 'EFFECT.Name', textSearch: true }),
			img: new fields.FilePathField({ categories: ['IMAGE'], label: 'EFFECT.Image' }),
			type: new fields.DocumentTypeField(this, { initial: CONST.BASE_DOCUMENT_TYPE }),
			system: new fields.TypeDataField(this),
			changes: new fields.ArrayField(
				new fields.SchemaField({
					key: new fields.StringField({ required: true, label: 'EFFECT.ChangeKey' }),
					value: new fields.StringField({ required: true, label: 'EFFECT.ChangeValue' }),
					mode: new fields.NumberField({ integer: true, initial: CONST.ACTIVE_EFFECT_MODES.ADD, label: 'EFFECT.ChangeMode' }),
					priority: new fields.NumberField(),
				}),
			),
			disabled: new fields.BooleanField(),
			duration: new fields.SchemaField({
				startTime: new fields.NumberField({ initial: null, label: 'EFFECT.StartTime' }),
				seconds: new fields.NumberField({ integer: true, min: 0, label: 'EFFECT.DurationSecs' }),
				combat: new fields.ForeignDocumentField(foundry.documents.BaseCombat, { label: 'EFFECT.Combat' }),
				rounds: new fields.NumberField({ integer: true, min: 0 }),
				turns: new fields.NumberField({ integer: true, min: 0, label: 'EFFECT.DurationTurns' }),
				startRound: new fields.NumberField({ integer: true, min: 0 }),
				startTurn: new fields.NumberField({ integer: true, min: 0, label: 'EFFECT.StartTurns' }),
			}),
			description: new fields.HTMLField({ label: 'EFFECT.Description', textSearch: true }),
			origin: new fields.StringField({ nullable: true, blank: false, initial: null, label: 'EFFECT.Origin' }),
			tint: new fields.ColorField({ nullable: false, initial: '#ffffff', label: 'EFFECT.Tint' }),
			transfer: new fields.BooleanField({ initial: true, label: 'EFFECT.Transfer' }),
			statuses: new fields.SetField(new fields.StringField({ required: true, blank: false })),
			sort: new fields.IntegerSortField(),
			flags: new fields.ObjectField(),
		};
	}

	static metadata = Object.freeze(
		foundry.utils.mergeObject(
			super.metadata,
			{
				hasTypeData: true,
				label: 'DOCUMENT.ActiveEffect',
			},
			{ inplace: false },
		),
	);

	/**
	 * Retrieve the Document that this ActiveEffect targets for modification.
	 * @type {Document|null}
	 */
	get target() {
		if (this.parent instanceof Actor) return this.parent;
		if (CONFIG.ActiveEffect.legacyTransferral) return this.transfer ? null : this.parent;
		return this.transfer ? this.parent.actor ?? null : this.parent;
	}

	/* -------------------------------------------- */

	/**
	 * Whether the Active Effect currently applying its changes to the target.
	 * @type {boolean}
	 */
	get active() {
		return !this.disabled && !this.isSuppressed;
	}

	/* -------------------------------------------- */

	/**
	 * Does this Active Effect currently modify an Actor?
	 * @type {boolean}
	 */
	get modifiesActor() {
		if (!this.active) return false;
		if (CONFIG.ActiveEffect.legacyTransferral) return this.parent instanceof Actor;
		return this.target instanceof Actor;
	}

	get isTemporary() {
		const duration = this.duration.seconds ?? (this.duration.rounds || this.duration.turns) ?? 0;
		return duration > 0 || this.statuses.size > 0 || !!this.getFlag(SYSTEM, FUActiveEffect.TEMPORARY_FLAG);
	}

	get isSuppressed() {
		// TODO: Refactor, handle other predicates
		if (this.system.predicate.suppressed === true) {
			return true;
		}
		if (this.target instanceof FUActor) {
			const flag = this.system.predicate.crisisInteraction;
			if (flag && flag !== 'none') {
				if (this.target.effects.find((e) => e.statuses.has('crisis')) != null) {
					return flag === 'inactive';
				} else {
					return flag === 'active';
				}
			}
		}
		if (this.target instanceof PseudoItem && this.target.parent instanceof FUActor) {
			const flag = this.system.predicate.crisisInteraction;
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

	apply(actor, change) {
		// Support expressions
		if (change.value && typeof change.value === 'string') {
			try {
				// First, evaluate using built-in support
				const expression = Roll.replaceFormulaData(change.value, this.parent);
				// Second, evaluate with our custom expressions
				const context = ExpressionContext.resolveTarget(actor);
				const value = Expressions.evaluate(expression, context);
				change.value = String(value ?? 0);
			} catch (e) {
				console.error(e);
				ui.notifications?.error(
					game.i18n.format('FU.EffectChangeInvalidFormula', {
						key: change.key,
						effect: this.name,
						target: actor.name,
					}),
				);
				return {};
			}
		}

		let field;
		const changes = {};
		if (change.key.startsWith('system.')) {
			if (actor.system instanceof foundry.abstract.DataModel) {
				field = actor.system.schema.getField(change.key.slice(7));
			}
		} else field = actor.schema.getField(change.key);
		if (field) changes[change.key] = this.constructor.applyField(actor, change, field);
		else this._applyLegacy(actor, change, changes);
		return changes;
	}

	/**
	 * Apply EffectChangeData to a field within a DataModel.
	 * @param {DataModel} model          The model instance.
	 * @param {EffectChangeData} change  The change to apply.
	 * @param {DataField} [field]        The field. If not supplied, it will be retrieved from the supplied model.
	 * @returns {*}                      The updated value.
	 */
	static applyField(model, change, field) {
		field ??= model.schema.getField(change.key);
		const current = foundry.utils.getProperty(model, change.key);
		const update = field.applyChange(current, model, change);
		foundry.utils.setProperty(model, change.key, update);
		return update;
	}

	/**
	 * Apply this ActiveEffect to a provided Actor using a heuristic to infer the value types based on the current value
	 * and/or the default value in the template.json.
	 * @param {Actor} actor                The Actor to whom this effect should be applied.
	 * @param {EffectChangeData} change    The change data being applied.
	 * @param {Record<string, *>} changes  The aggregate update paths and their updated values.
	 * @protected
	 */
	_applyLegacy(actor, change, changes) {
		// Determine the data type of the target field
		const current = foundry.utils.getProperty(actor, change.key) ?? null;
		let target = current;
		if (current === null) {
			const model = game.model.Actor[actor.type] || {};
			target = foundry.utils.getProperty(model, change.key) ?? null;
		}
		let targetType = foundry.utils.getType(target);

		// Cast the effect change value to the correct type
		let delta;
		try {
			if (targetType === 'Array') {
				const innerType = target.length ? foundry.utils.getType(target[0]) : 'string';
				delta = this._castArray(change.value, innerType);
			} else delta = this._castDelta(change.value, targetType);
		} catch (err) {
			console.warn(`Actor [${actor.id}] | Unable to parse active effect change for ${change.key}: "${change.value}"`);
			return;
		}

		// Apply the change depending on the application mode
		const modes = CONST.ACTIVE_EFFECT_MODES;
		switch (change.mode) {
			case modes.ADD:
				this._applyAdd(actor, change, current, delta, changes);
				break;
			case modes.MULTIPLY:
				this._applyMultiply(actor, change, current, delta, changes);
				break;
			case modes.OVERRIDE:
				this._applyOverride(actor, change, current, delta, changes);
				break;
			case modes.UPGRADE:
			case modes.DOWNGRADE:
				this._applyUpgrade(actor, change, current, delta, changes);
				break;
			default:
				this._applyCustom(actor, change, current, delta, changes);
				break;
		}

		// Apply all changes to the Actor data
		foundry.utils.mergeObject(actor, changes);
	}

	/* -------------------------------------------- */

	/**
	 * Cast a raw EffectChangeData change string to the desired data type.
	 * @param {string} raw      The raw string value
	 * @param {string} type     The target data type that the raw value should be cast to match
	 * @returns {*}             The parsed delta cast to the target data type
	 * @private
	 */
	_castDelta(raw, type) {
		let delta;
		switch (type) {
			case 'boolean':
				delta = Boolean(this._parseOrString(raw));
				break;
			case 'number':
				delta = Number.fromString(raw);
				if (Number.isNaN(delta)) delta = 0;
				break;
			case 'string':
				delta = String(raw);
				break;
			default:
				delta = this._parseOrString(raw);
		}
		return delta;
	}

	/* -------------------------------------------- */

	/**
	 * Cast a raw EffectChangeData change string to an Array of an inner type.
	 * @param {string} raw      The raw string value
	 * @param {string} type     The target data type of inner array elements
	 * @returns {Array<*>}      The parsed delta cast as a typed array
	 * @private
	 */
	_castArray(raw, type) {
		let delta;
		try {
			delta = this._parseOrString(raw);
			delta = delta instanceof Array ? delta : [delta];
		} catch (e) {
			delta = [raw];
		}
		return delta.map((d) => this._castDelta(d, type));
	}

	/* -------------------------------------------- */

	/**
	 * Parse serialized JSON, or retain the raw string.
	 * @param {string} raw      A raw serialized string
	 * @returns {*}             The parsed value, or the original value if parsing failed
	 * @private
	 */
	_parseOrString(raw) {
		try {
			return JSON.parse(raw);
		} catch (err) {
			return raw;
		}
	}

	/* -------------------------------------------- */

	/**
	 * Apply an ActiveEffect that uses an ADD application mode.
	 * The way that effects are added depends on the data type of the current value.
	 *
	 * If the current value is null, the change value is assigned directly.
	 * If the current type is a string, the change value is concatenated.
	 * If the current type is a number, the change value is cast to numeric and added.
	 * If the current type is an array, the change value is appended to the existing array if it matches in type.
	 *
	 * @param {Actor} actor                   The Actor to whom this effect should be applied
	 * @param {EffectChangeData} change       The change data being applied
	 * @param {*} current                     The current value being modified
	 * @param {*} delta                       The parsed value of the change object
	 * @param {object} changes                An object which accumulates changes to be applied
	 * @private
	 */
	_applyAdd(actor, change, current, delta, changes) {
		let update;
		const ct = foundry.utils.getType(current);
		switch (ct) {
			case 'boolean':
				update = current || delta;
				break;
			case 'null':
				update = delta;
				break;
			case 'Array':
				update = current.concat(delta);
				break;
			default:
				update = current + delta;
				break;
		}
		changes[change.key] = update;
	}

	/* -------------------------------------------- */

	/**
	 * Apply an ActiveEffect that uses a MULTIPLY application mode.
	 * Changes which MULTIPLY must be numeric to allow for multiplication.
	 * @param {Actor} actor                   The Actor to whom this effect should be applied
	 * @param {EffectChangeData} change       The change data being applied
	 * @param {*} current                     The current value being modified
	 * @param {*} delta                       The parsed value of the change object
	 * @param {object} changes                An object which accumulates changes to be applied
	 * @private
	 */
	_applyMultiply(actor, change, current, delta, changes) {
		let update;
		const ct = foundry.utils.getType(current);
		switch (ct) {
			case 'boolean':
				update = current && delta;
				break;
			case 'number':
				update = current * delta;
				break;
		}
		changes[change.key] = update;
	}

	/* -------------------------------------------- */

	/**
	 * Apply an ActiveEffect that uses an OVERRIDE application mode.
	 * Numeric data is overridden by numbers, while other data types are overridden by any value
	 * @param {Actor} actor                   The Actor to whom this effect should be applied
	 * @param {EffectChangeData} change       The change data being applied
	 * @param {*} current                     The current value being modified
	 * @param {*} delta                       The parsed value of the change object
	 * @param {object} changes                An object which accumulates changes to be applied
	 * @private
	 */
	_applyOverride(actor, change, current, delta, changes) {
		return (changes[change.key] = delta);
	}

	/* -------------------------------------------- */

	/**
	 * Apply an ActiveEffect that uses an UPGRADE, or DOWNGRADE application mode.
	 * Changes which UPGRADE or DOWNGRADE must be numeric to allow for comparison.
	 * @param {Actor} actor                   The Actor to whom this effect should be applied
	 * @param {EffectChangeData} change       The change data being applied
	 * @param {*} current                     The current value being modified
	 * @param {*} delta                       The parsed value of the change object
	 * @param {object} changes                An object which accumulates changes to be applied
	 * @private
	 */
	_applyUpgrade(actor, change, current, delta, changes) {
		let update;
		const ct = foundry.utils.getType(current);
		switch (ct) {
			case 'boolean':
			case 'number':
				if (change.mode === CONST.ACTIVE_EFFECT_MODES.UPGRADE && delta > current) update = delta;
				else if (change.mode === CONST.ACTIVE_EFFECT_MODES.DOWNGRADE && delta < current) update = delta;
				break;
		}
		changes[change.key] = update;
	}

	/* -------------------------------------------- */

	/**
	 * Apply an ActiveEffect that uses a CUSTOM application mode.
	 * @param {Actor} actor                   The Actor to whom this effect should be applied
	 * @param {EffectChangeData} change       The change data being applied
	 * @param {*} current                     The current value being modified
	 * @param {*} delta                       The parsed value of the change object
	 * @param {object} changes                An object which accumulates changes to be applied
	 * @private
	 */
	_applyCustom(actor, change, current, delta, changes) {
		const preHook = foundry.utils.getProperty(actor, change.key);
		Hooks.call('applyActiveEffect', actor, change, current, delta, changes);
		const postHook = foundry.utils.getProperty(actor, change.key);
		if (postHook !== preHook) changes[change.key] = postHook;
	}

	static _logDataFieldMigration(oldKey, newKey, options = {}) {
		const msg = `You are accessing ${this.name}#${oldKey} which has been migrated to ${this.name}#${newKey}`;
		return foundry.utils.logCompatibilityWarning(msg, { ...options });
	}

	/**
	 * @deprecated since v11
	 * @ignore
	 */
	get label() {
		this.constructor._logDataFieldMigration('label', 'name', { since: 11, until: 13, once: true });
		return this.name;
	}

	/**
	 * @deprecated since v11
	 * @ignore
	 */
	set label(value) {
		this.constructor._logDataFieldMigration('label', 'name', { since: 11, until: 13, once: true });
		this.name = value;
	}

	/* -------------------------------------------- */

	/**
	 * @deprecated since v12
	 * @ignore
	 */
	get icon() {
		this.constructor._logDataFieldMigration('icon', 'img', { since: 12, until: 14, once: true });
		return this.img;
	}

	/**
	 * @deprecated since v12
	 * @ignore
	 */
	set icon(value) {
		this.constructor._logDataFieldMigration('icon', 'img', { since: 12, until: 14, once: true });
		this.img = value;
	}
}
