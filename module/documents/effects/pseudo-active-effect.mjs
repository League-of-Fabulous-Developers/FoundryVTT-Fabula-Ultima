import { PseudoDocument } from '../pseudo/pseudo-document.mjs';
import { ActiveEffectBehaviourMixin } from './active-effect-behaviour-mixin.mjs';

class BasePseudoActiveEffect extends PseudoDocument {
	static documentName = 'ActiveEffect';

	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			_id: new fields.StringField({ initial: () => foundry.utils.randomID(), validate: foundry.data.validators.isValidId }),
			name: new fields.StringField({ initial: () => game.i18n.format('DOCUMENT.New', { type: game.i18n.localize(this.metadata.label) }), required: true, blank: false, textSearch: true }),
			img: new fields.FilePathField({ categories: ['IMAGE'] }),
			type: new fields.DocumentTypeField(this, { initial: CONST.BASE_DOCUMENT_TYPE }),
			system: new fields.TypeDataField(this),
			disabled: new fields.BooleanField(),
			start: new fields.SchemaField(
				{
					combat: new fields.ForeignDocumentField(foundry.documents.BaseCombat),
					combatant: new fields.ForeignDocumentField(foundry.documents.BaseCombatant, { idOnly: true }),
					initiative: new fields.NumberField({ required: true }),
					round: new fields.NumberField({ required: true, integer: true, min: 0 }),
					turn: new fields.NumberField({ required: true, integer: true, min: 0 }),
					time: new fields.NumberField({ required: true, nullable: false, integer: true }),
				},
				{ nullable: true },
			),
			duration: new fields.SchemaField({
				value: new fields.NumberField({ required: true, nullable: true, integer: true, min: 0 }),
				units: new fields.StringField({ required: true, choices: CONST.ACTIVE_EFFECT_DURATION_UNITS, initial: 'seconds' }),
				expiry: new fields.StringField({ required: true, blank: false, nullable: true, initial: (d) => (typeof d?.duration?.value === 'number' ? 'turnStart' : null) }),
				expired: new fields.BooleanField(),
			}),
			description: new fields.HTMLField({ textSearch: true }),
			origin: new fields.StringField({ nullable: true, blank: false, initial: null }),
			tint: new fields.ColorField({ nullable: false, initial: '#ffffff' }),
			transfer: new fields.BooleanField({ initial: true }),
			statuses: new fields.SetField(new fields.StringField({ required: true, blank: false })),
			showIcon: new fields.NumberField({
				required: true,
				nullable: false,
				choices: Object.values(CONST.ACTIVE_EFFECT_SHOW_ICON),
				initial: CONST.ACTIVE_EFFECT_SHOW_ICON.CONDITIONAL,
			}),
			sort: new fields.IntegerSortField(),
			flags: new fields.DocumentFlagsField(),
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

	static LOCALIZATION_PREFIXES = foundry.documents.ActiveEffect.LOCALIZATION_PREFIXES;

	static DEFAULT_ICON = foundry.documents.ActiveEffect.DEFAULT_ICON;

	async _preCreate(data, options, user) {
		const allowed = await super._preCreate(data, options, user);
		if (allowed === false) return false;
		const updates = {};
		if (!this.parent || this.parent instanceof foundry.documents.BaseActor) {
			updates.transfer = false;
			if (!this.parent) updates.start = null;
		}
		this.updateSource(updates);
	}

	static #MODES_TO_TYPES = {
		0: 'custom',
		1: 'multiply',
		2: 'add',
		3: 'downgrade',
		4: 'upgrade',
		5: 'override',
	};

	static #TYPES_TO_MODES = Object.entries(BasePseudoActiveEffect.#MODES_TO_TYPES).reduce((types, [mode, type]) => {
		types[type] = Number(mode);
		return types;
	}, {});

	static migrateData(source, options) {
		/**
		 * Migrate origin
		 * @deprecated since v14
		 */
		if (typeof source.origin === 'string') {
			const parseOptions = source.origin.startsWith('.') ? { relative: new foundry.documents.ActiveEffect({ name: 'ABC' }) } : {};
			const parsed = foundry.utils.parseUuid(source.origin, parseOptions);
			if (!parsed || (parsed.type && !CONST.ALL_DOCUMENT_TYPES.includes(parsed.type))) {
				foundry.utils.mergeObject((source.flags ??= {}), { core: { originText: source.origin } });
				source.origin = null;
			}
		}

		/**
		 * Migrate changes
		 * @deprecated since v14
		 */
		if (Array.isArray(source.changes)) {
			source.system ??= {};
			this._addDataFieldMigration(source, 'changes', 'system.changes');
			if (Array.isArray(source.system.changes)) {
				for (const change of source.system.changes) {
					if (!Object.hasOwn(change, 'type') && typeof change.mode === 'number') {
						change.type = BasePseudoActiveEffect.#MODES_TO_TYPES[change.mode] ?? `custom.${change.mode}`;
						delete change.mode;
					}
					if (foundry.utils.isPlainObject(change) && typeof change.value === 'string') {
						change.value = BasePseudoActiveEffect.#migrateChangeValue(change.value);
					}
				}
			}
		}

		/**
		 * Migrate start data
		 * @deprecated since v14
		 */
		const duration = source.duration;
		if (foundry.utils.isPlainObject(duration) && Object.hasOwn(duration, 'startTime') && !Object.hasOwn(source, 'start')) {
			source.start = typeof duration.startTime === 'number' ? {} : null;
			if (source.start) {
				this._addDataFieldMigration(source, 'duration.combat', 'start.combat');
				this._addDataFieldMigration(source, 'duration.startRound', 'start.round');
				this._addDataFieldMigration(source, 'duration.startTime', 'start.time');
				this._addDataFieldMigration(source, 'duration.startTurn', 'start.turn');
			}
		}
		BasePseudoActiveEffect.#migrateDuration(source);

		return super.migrateData(source, options);
	}

	static #migrateChangeValue(value) {
		if (typeof value !== 'string' || value === '') return value;
		try {
			return BasePseudoActiveEffect.#migrateChangeValue(JSON.parse(value));
		} catch {
			return value;
		}
	}

	static #migrateDuration(source) {
		const duration = source.duration;
		if (!foundry.utils.isPlainObject(duration)) return;
		for (const unit of ['seconds', 'turns', 'rounds']) {
			const hasRealProperty = Object.hasOwn(duration, unit) && !Object.getOwnPropertyDescriptor(duration, unit)?.get;
			if (hasRealProperty && typeof duration[unit] === 'number') {
				if (!Object.hasOwn(duration, 'value')) duration.value = duration[unit];
				if (!Object.hasOwn(duration, 'units')) duration.units = unit;
				break;
			}
		}
	}

	static shimData(data, options) {
		if (Object.isSealed(data)) return super.shimData(data, options);
		if (!Object.hasOwn(data, 'changes') && Object.hasOwn(data.system ?? {}, 'changes')) {
			Object.defineProperty(data, 'changes', {
				get: () => data.system.changes,
				set: (changes) => {
					data.system.changes = changes;
				},
				configurable: true,
				enumerable: false,
			});
		}
		const changes = Array.isArray(data.system?.changes) ? data.system.changes : [];
		this._shimChanges(changes);

		if (!foundry.utils.isPlainObject(data.duration)) return super.shimData(data, options);
		if (foundry.utils.isPlainObject(data.start)) {
			this._addDataFieldShim(data, 'duration.combat', 'start.combat', { since: 14, until: 16, once: true });
		}
		for (const key of ['startTime', 'startRound', 'startTurn']) {
			const newKey = key
				.split(/(?=[A-Z])/)
				.map((k) => k.toLocaleLowerCase('en'))
				.join('.');
			this._addDataFieldShim(data, `duration.${key}`, newKey, { since: 14, until: 16, once: true });
		}
		const getSeconds = () => {
			if (typeof data.duration.value !== 'number') return null;
			if (data.duration.units === 'seconds') return data.duration.value;
			if (game.view === 'game' && CONST.ACTIVE_EFFECT_TIME_DURATION_UNITS.includes(data.duration.units)) {
				const componentUnit = data.duration.units.replace(/s$/, '');
				return game.time.calendar.componentsToTime({ [componentUnit]: data.duration.value });
			}
			return null;
		};
		BasePseudoActiveEffect.#shimDurationField(data.duration, 'seconds', getSeconds);
		BasePseudoActiveEffect.#shimDurationField(data.duration, 'rounds');
		BasePseudoActiveEffect.#shimDurationField(data.duration, 'turns');
		return super.shimData(data, options);
	}

	static _shimChanges(changes) {
		for (const change of changes) {
			if (Object.getOwnPropertyDescriptor(change, 'mode')?.get) continue;
			Object.defineProperty(change, 'mode', {
				get: () => {
					const message = 'You are accessing the numeric #mode of an ActiveEffect change. Use the string #type instead.';
					foundry.utils.logCompatibilityWarning(message, { since: 14, until: 16, once: true });
					return BasePseudoActiveEffect.#TYPES_TO_MODES[change.type] ?? (Number(/^custom\.(-?\d+)$/.exec(change.type)?.[1]) || 0);
				},
				set: (mode) => {
					mode = Number(mode);
					if (Number.isInteger(mode)) change.type = BasePseudoActiveEffect.#MODES_TO_TYPES[mode] ?? `custom.${mode}`;
				},
				configurable: true,
				enumerable: false,
			});
		}
	}

	static #shimDurationField(duration, oldKey, get) {
		if (Object.hasOwn(duration, oldKey)) return;
		get ??= () => (duration.units === oldKey ? duration.value : null);
		const propertyPath = oldKey.replaceAll('.', '#');
		const message = `You are accessing ${this.name}#${propertyPath}. Duration data now has value and units fields.`;
		Object.defineProperty(duration, oldKey, {
			get: () => {
				foundry.utils.logCompatibilityWarning(message, { since: 14, until: 16, once: true });
				return get();
			},
			configurable: true,
			enumerable: false,
		});
	}

	/**
	 * A cached compilation of core and registered application phases, along with their labels
	 * @type {Record<string, {label: string; hint: string}>}
	 */
	static get CHANGE_PHASES() {
		return foundry.documents.ActiveEffect.CHANGE_PHASES;
	}

	/**
	 * A cached compilation of core and registered change types, along with their labels and default priorities
	 * @type {Record<string, ActiveEffectChangeTypeConfig>}
	 */
	static get CHANGE_TYPES() {
		return foundry.documents.ActiveEffect.CHANGE_TYPES;
	}

	/**
	 * A cached compilation of core and registered expiry events
	 * @type {Record<string, string>}
	 */
	static get EXPIRY_EVENTS() {
		return foundry.documents.ActiveEffect.EXPIRY_EVENTS;
	}

	/**
	 * A helper class that accepts registration of ActiveEffects and manages their prepared duration and expiry data.
	 * @type {ActiveEffectRegistry}
	 */
	static get registry() {
		return foundry.documents.ActiveEffect.registry;
	}

	/**
	 * Provide a thumbnail image path used to represent this document.
	 * @type {string}
	 */
	get thumbnail() {
		return this.img;
	}

	/**
	 * Is there some system logic that makes this active effect ineligible for application?
	 * @type {boolean}
	 */
	get isSuppressed() {
		return !!(this.system.isSuppressed ?? this.duration.expired);
	}

	/**
	 * Retrieve the Document that this ActiveEffect targets for modification.
	 * @type {Document|null}
	 */
	get target() {
		return this.transfer ? (this.parent.actor ?? null) : this.parent;
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
		return this.active && this.target?.documentName === 'Actor';
	}

	/**
	 * Whether this Active Effect has a temporary duration
	 * @type {boolean}
	 */
	get isTemporary() {
		return !!this.duration.expiry || Number.isFinite(this.duration.value);
	}

	/**
	 * Whether this Active Effect is eligible to be registered with the {@link ActiveEffectRegistry}
	 */
	get isExpiryTrackable() {
		return this.persisted && !this.inCompendium && this.isEmbedded && this.active && !!this.start && this.isTemporary;
	}

	/** @inheritDoc */
	_initialize(options = {}) {
		super._initialize(options);
		if (!Object.hasOwn(this, 'changes')) Object.defineProperty(this, 'changes', { get: () => this.system.changes });
		foundry.documents.ActiveEffect._shimChanges(this.system.changes);
	}

	/** @override */
	prepareBaseData() {
		this.img ??= foundry.documents.ActiveEffect.DEFAULT_ICON;
		this.duration.value ??= Infinity;
		for (const change of this.system.changes) {
			change.effect = this;
			change.priority ??= ActiveEffect.CHANGE_TYPES[change.type]?.defaultPriority ?? 0;
		}
	}

	/** @override */
	prepareDerivedData() {
		this.updateDuration();
	}

	/**
	 * Update derived Active Effect duration data.
	 * @param {object} [context] Contextual information indicating what lead to this call
	 * @returns {ActiveEffectDuration}
	 */
	updateDuration(context) {
		const unprepared = this.duration.units === this._source.duration.units ? this.duration : foundry.utils.deepClone(this._source.duration);
		unprepared.value ??= Infinity;
		const duration = (this.duration = this._prepareDuration(unprepared, context));
		if (!Object.hasOwn(duration, 'type') || !Object.hasOwn(duration, 'duration')) {
			Object.defineProperties(duration, {
				type: {
					get: () => {
						const message = 'You are accessing ActiveEffectDuration#type, which is now at ActiveEffectDuration#units.';
						foundry.utils.logCompatibilityWarning(message, { since: 14, until: 16, once: true });
						return typeof duration.value === 'number' ? duration.units : 'none';
					},
					configurable: true,
				},
				duration: {
					get() {
						foundry.utils.logCompatibilityWarning('You are accessing ActiveEffectDuration#duration, ' + 'which is now at ActiveEffectDuration#seconds.', { since: 14, until: 16, once: true });
						return this.start ? duration.seconds - (game.time.worldtime - this.start.time) : null;
					},
					configurable: true,
				},
			});
		}
		return duration;
	}

	/**
	 * Compute derived data related to active effect duration.
	 * @param {EffectDurationData} [duration] Unprepared duration data
	 * @param {object} [context]              Contextual information indicating what lead to this call
	 * @returns {ActiveEffectDuration}
	 * @protected
	 */
	_prepareDuration(duration, context) {
		duration ??= this.duration;
		const now = game.time.worldTime;
		duration._worldTime = now;

		// Indefinite duration
		if (!this.isTemporary) duration.expired = false;
		if (!Number.isFinite(duration.value)) {
			return Object.assign(duration, { seconds: Infinity, remaining: Infinity, secondsRemaining: Infinity, label: _loc('COMMON.None') });
		}

		return CONST.ACTIVE_EFFECT_TIME_DURATION_UNITS.includes(duration.units) ? this._prepareTimeBasedDuration(duration, context) : this._prepareCombatBasedDuration(duration, context);
	}

	/**
	 * Prepare duration data from time-based (minutes, seconds, etc.) source data.
	 * @param {EffectDurationData} duration Unprepared duration data
	 * @param {object} [context]            Contextual information indicating what lead to this call
	 * @returns {ActiveEffectDuration}
	 * @protected
	 */
	_prepareTimeBasedDuration(duration, context) {
		const calendar = game.time.calendar;
		const durationInMonths = duration.units === 'months';
		const unitsSingular = durationInMonths ? 'day' : duration.units.slice(0, -1);
		const avgDaysPerMonth = durationInMonths && calendar.months.values.length ? calendar.days.daysPerYear / calendar.months.values.length : 0;
		const durationValue = durationInMonths ? Math.ceil(duration.value * avgDaysPerMonth) : duration.value;
		const seconds = calendar.componentsToTime({ [unitsSingular]: durationValue });
		const worldTime = game.time.worldTime;

		// Use the current world time as the start time effects lacking one
		const start = this.start ?? { time: worldTime };

		// Handle remaining value and label given the duration is exceeded
		const secondsRemaining = start.time + seconds - worldTime;
		let remainingComponents;
		let formatter;
		let roundFn;
		if (secondsRemaining < 0) {
			// Work around limitations of calendar API when there is a negative difference
			remainingComponents = calendar.difference(worldTime, worldTime + secondsRemaining);
			formatter = 'formatAgo';
			roundFn = 'floor';
		} else {
			if (secondsRemaining > 0) duration.expired = false;
			remainingComponents = calendar.difference(start.time + seconds);
			formatter = 'formatDuration';
			roundFn = 'ceil';
		}
		let remaining;
		if (durationInMonths) {
			// Months may not have a constant number of days and require approximation favoring later rather than earlier
			// expiration
			if (avgDaysPerMonth === 0) remaining = 0;
			else {
				const { secondsPerMinute, minutesPerHour, hoursPerDay } = calendar.days;
				const secondsPerMonth = avgDaysPerMonth * hoursPerDay * minutesPerHour * secondsPerMinute;
				remaining = Math.sign(secondsRemaining) * Math[roundFn](Math.abs(secondsRemaining / secondsPerMonth));
			}
		} else {
			const absRemaining = calendar.componentsToUnit(remainingComponents, unitsSingular, { roundFn });
			remaining = Math.sign(secondsRemaining) * absRemaining;
		}
		const formattableComponents = foundry.utils.iterateEntries(remainingComponents).reduce((components, [unit, value]) => {
			if (durationInMonths && unit === 'day' && value > avgDaysPerMonth) return components;
			if (value && foundry.data.CalendarData._DURATION_FORMAT_UNITS.has(unit)) components[unit] = value;
			return components;
		}, {});
		const label = calendar.format(formattableComponents, formatter, { style: 'short', maxTerms: 2 }) || _loc('TIME.Now');
		return Object.assign(duration, { seconds, remaining, secondsRemaining, label });
	}

	/**
	 * Prepare duration data from combat-based (rounds or turns) source data.
	 * @param {EffectDurationData} duration Unprepared duration data
	 * @param {object} [context]            Contextual information indicating what lead to this call
	 * @returns {ActiveEffectDuration}
	 * @protected
	 */
	_prepareCombatBasedDuration(duration, context) {
		const unitsSingular = duration.units.replace(/s$/, '');
		/** @type {number} */
		const timeConversion = CONFIG.time[`${unitsSingular}Time`] || 0;
		const seconds = (duration.seconds = timeConversion ? Math.trunc(duration.value * timeConversion) : null);
		const worldTime = game.time.worldTime;
		const start = this.start ?? { time: worldTime };
		const combat = game.combats.get(start.combat?.id) ?? game.combat;
		const combatant = combat?.combatants.get(start.combatant) ?? combat?.getCombatantsByActor(this.actor)[0];

		// If no combat information is available, reframe the presented duration as time-based
		if (!combatant || !combat.started || !combat.turns.length) {
			return game._documentsReady && Number.isFinite(seconds)
				? this._prepareTimeBasedDuration({ ...duration, units: 'seconds', value: seconds })
				: Object.assign(duration, { remaining: Infinity, secondsRemaining: Infinity, label: _loc('COMMON.None') });
		}

		// Acquire the start round and turn number from the combatant if the current combat is not the same as the starting
		// one.
		const [startRound, startTurn] = combat === start.combat ? [start.round ?? combatant.roundJoined, (start.turn ?? 0) + 1] : [combatant.roundJoined, combatant.turnNumber + 1];

		const currentRound = context?.round ?? combat.round;
		const timeElapsed = timeConversion ? worldTime - start.time : 0;
		switch (duration.units) {
			case 'rounds': {
				const elapsedInCombat = currentRound - startRound;
				const totalElapsedInCombat = currentRound - 1;
				const elapsedBeforeCombat = timeConversion ? Math.max(0, Math.floor(timeElapsed / timeConversion) - totalElapsedInCombat) : 0;
				const remaining = duration.value - (elapsedInCombat + elapsedBeforeCombat);
				const pluralRule = game.i18n.pluralRules.select(Math.abs(remaining));
				const locKey = remaining >= 0 ? 'EFFECT.DURATION.ROUNDS' : 'EFFECT.DURATION.ROUNDS_AGO';
				Object.assign(duration, { remaining, label: _loc(`${locKey}.${pluralRule}`, { rounds: Math.abs(remaining) }) });
				break;
			}
			case 'turns': {
				const currentTurn = 1 + (context?.turn ?? combat.turn);
				const turnsPerRound = combat.turns.length;
				const elapsedPriorRounds = Math.max(0, turnsPerRound - startTurn + turnsPerRound * (currentRound - startRound - 1));
				const elapsedThisRound = startRound === currentRound ? Math.max(0, currentTurn - startTurn) : currentTurn;
				const elapsedInCombat = elapsedPriorRounds + elapsedThisRound;
				const elapsedBeforeCombat = timeConversion ? Math.floor(timeElapsed / timeConversion) - elapsedInCombat : 0;
				const remaining = duration.value - (elapsedInCombat + elapsedBeforeCombat);
				const pluralRule = game.i18n.pluralRules.select(Math.abs(remaining));
				const locKey = remaining >= 0 ? 'EFFECT.DURATION.TURNS' : 'EFFECT.DURATION.TURNS_AGO';
				Object.assign(duration, { remaining, label: _loc(`${locKey}.${pluralRule}`, { turns: Math.abs(remaining) }) });
				break;
			}
		}
		if (timeConversion) duration.secondsRemaining = duration.remaining * timeConversion;
		else delete duration.secondsRemaining;
		return duration;
	}

	/** @inheritDoc */
	toCompendium(pack, options) {
		const data = super.toCompendium(pack, options);
		if (options?.clearState !== false) {
			data.origin = null;
			data.start = null;
		}
		return data;
	}

	/**
	 * Determine whether a change from this ActiveEffect should be applied during the current phase. Systems and modules
	 * may override this method to introduce additional conditions under which a change is applied.
	 * @param {ActiveEffectChangeData} change    The change being considered.
	 * @param {object} [options]                 Options which affect whether the change is applied.
	 * @param {string} [options.phase]           The application phase currently being evaluated.
	 * @param {string} [options.replacementData] Replacement data to be used as part of the change's application
	 * @returns {boolean}                        Should the change be applied during this phase (or at all)?
	 */
	shouldApplyChange(change, options) {
		return change.phase === options?.phase;
	}

	/**
	 * Acquire replacement data for use in the application of this effect's changes.
	 * @param {object} baseData Base data sourced from elsewhere (by default from `Actor#getRollData`)
	 * @returns {object}        Data used to resolve "@" expressions in string {@link ActiveEffectChangeData} values
	 */
	getReplacementData(baseData) {
		return baseData;
	}

	/**
	 * Apply this ActiveEffect to a target Document.
	 * @param {Actor|Item|TokenDocument} targetDoc The Document to which this effect should be applied
	 * @param {ActiveEffectChangeData} change      The change data being applied
	 * @param {object} [options]                   Options affecting the change application
	 * @param {object} [options.replacementData]   Data used to resolve "@" expressions in a string value
	 * @param {boolean} [options.modifyTarget]     Modify the target Document with the updated value.
	 * @returns {Record<string, unknown>} An object of property keys and their updated values
	 */
	static applyChange(targetDoc, change, options = {}) {
		console.warn("this shouldn't even be called. if it is being called the core implementation changed.");
		return foundry.documents.ActiveEffect.implementation.applyChange(targetDoc, change, options);
	}
}

export class PseudoActiveEffect extends ActiveEffectBehaviourMixin(BasePseudoActiveEffect) {}
