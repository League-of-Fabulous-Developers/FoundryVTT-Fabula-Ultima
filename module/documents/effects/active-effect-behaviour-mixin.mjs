import { Flags } from '../../helpers/flags.mjs';
import { SYSTEM } from '../../helpers/config.mjs';
import { FUActor } from '../actors/actor.mjs';
import { FUItem } from '../items/item.mjs';
import { PseudoItem } from '../items/pseudo-item.mjs';
import { ExpressionContext, Expressions } from '../../expressions/expressions.mjs';
import { Pipeline } from '../../pipelines/pipeline.mjs';
import { InlineSourceInfo } from '../../helpers/inline-helper.mjs';
import { SectionChatBuilder } from '../../helpers/section-chat-builder.mjs';
import { CommonEvents } from '../../checks/common-events.mjs';
import { CommonSections } from '../../checks/common-sections.mjs';
import { CHECK_FLAVOR } from '../../checks/default-section-order.mjs';

const HIGH_PRIORITY_CHANGES = new Set([
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
]);

const LOW_PRIORITY_CHANGES = new Set(['system.resources.hp.max', 'system.resources.mp.max', 'system.resources.ip.max']);

const defaultImage = 'icons/svg/aura.svg';

export function ActiveEffectBehaviourMixin(BaseDocument) {
	return class FUActiveEffectBehaviourMixin extends BaseDocument {
		// TODO: Remove once everyone's migrated
		static migrateData(source) {
			const crisisInteraction = 'CrisisInteraction';
			const type = 'type';

			this._addDataFieldMigration(source, `flags.${SYSTEM}.${type}`, 'system.type');
			this._addDataFieldMigration(source, `flags.${SYSTEM}.${crisisInteraction}`, 'system.predicate.crisisInteraction');
			return super.migrateData(source);
		}

		/**
		 * @override
		 */
		prepareBaseData() {
			super.prepareBaseData();
			for (let change of this.changes) {
				if (HIGH_PRIORITY_CHANGES.has(change.key)) {
					change.priority = change.mode;
				} else if (LOW_PRIORITY_CHANGES.has(change.key)) {
					change.priority = (change.mode + 1) * 10 + 100;
				} else {
					change.priority = (change.mode + 1) * 10;
				}
			}
		}

		/**
		 * @description Compute derived data related to active effect duration.
		 * @returns {{
		 *   type: string,
		 *   duration: number|null,
		 *   remaining: number|null,
		 *   label: string,
		 *   [_worldTime]: number,
		 *   [_combatTime]: number}
		 * }
		 * @private
		 * @override
		 */
		_prepareDuration() {
			// We handle this through the event system
			return {
				type: 'none',
				duration: null,
				remaining: null,
				label: game.i18n.localize('None'),
			};
		}

		/**
		 * @returns {boolean} True if the effect has a duration that is managed
		 */
		get hasDuration() {
			return this.system.duration.event !== 'none';
		}

		/**
		 * @returns {InlineSourceInfo} If present, information about the actor/item that was the source of this effect
		 */
		get sourceInfo() {
			return this.getFlag(Flags.Scope, Flags.ActiveEffect.Source);
		}

		/**
		 * @returns {String} If present, an unique identifier for this effect. (Such as the fuid)
		 */
		get identifier() {
			return this.getFlag(Flags.Scope, Flags.ActiveEffect.Identifier);
		}

		/**
		 * @param {String} id
		 */
		matches(id) {
			if (this.name.toLowerCase() === id) {
				return true;
			}
			if (this.statuses.has(id)) {
				return true;
			}
			if (this.identifier === id) {
				return true;
			}
			if (this.sourceInfo) {
				if (this.sourceInfo.fuid === id) {
					return true;
				}
			}
			return false;
		}

		/**
		 * @returns {String}
		 * @remarks Used by the templates
		 */
		get sourceName() {
			if (this.sourceInfo) {
				return this.sourceInfo.name;
			}
			return this.parent.name;
		}

		/**
		 * @description Automatically deactivate effects with expired durations
		 * @override
		 * @returns {Boolean}
		 */
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
			if (this.target instanceof FUItem && this.target.parent instanceof FUActor) {
				const flag = this.system.predicate.crisisInteraction;
				if (flag && flag !== 'none') {
					if (this.target.parent.effects.find((e) => e.statuses.has('crisis')) != null) {
						return flag === 'inactive';
					} else {
						return flag === 'active';
					}
				}
			}
			if (this.target instanceof PseudoItem && this.target.parentFoundryDocument?.parent instanceof FUActor) {
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

		/**
		 * @description Check if the effect's subtype has special handling, otherwise fallback to normal `duration` and `statuses` check
		 * @override
		 */
		get isTemporary() {
			return super.isTemporary || !!this.getFlag(Flags.Scope, Flags.ActiveEffect.Temporary) || this.system.duration.event !== 'none';
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
					const context = this.resolveExpressionContext(target);
					const value = Expressions.evaluate(expression, context);
					change.value = String(value ?? 0);
					console.debug(`Assigning ${change.key} (MODE ${change.mode}): ${change.value}`);
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

			const changes = super.apply(target, change);
			if (change.mode === CONST.ACTIVE_EFFECT_MODES.CUSTOM && changes[change.key] == null) {
				delete changes[change.key];
			}
			return changes;
		}

		/**
		 * @description Resolves the context based on the target type
		 * @param {FUActor|FUItem} target
		 * @returns {ExpressionContext}
		 */
		resolveExpressionContext(target) {
			let actor;
			let item;

			// 1. The effect is being applied onto an actor
			// 2. The effect is being applied onto an item
			if (target instanceof FUActor) {
				actor = target;
				if (this.parent instanceof FUItem) {
					item = this.parent;
				}
			} else if (target instanceof FUItem) {
				item = target;
				actor = item.actor;
			}

			const context = new ExpressionContext(actor, item, [target]);
			context.effect = this;
			if (this.sourceInfo) {
				context.setSourceItem(this.sourceInfo.itemUuid);
			}
			return context;
		}

		/**
		 * @description Emits a chat message with this effect
		 * @returns {Promise<void>}
		 */
		async sendToChat() {
			let flags = Pipeline.initializedFlags(Flags.ChatMessage.Effect, this.uuid);
			let item;
			let actor;

			if (this.parent instanceof FUItem) {
				item = this.parent;
				actor = item.parent;
				Pipeline.setFlag(flags, Flags.ChatMessage.Item, this.parent.uuid);
				Pipeline.setFlag(flags, Flags.ChatMessage.Fuid, this.parent.system.fuid);
			} else if (this.parent instanceof FUActor) {
				actor = this.parent;
			}

			const chatBuilder = new SectionChatBuilder(actor);
			CommonSections.template(
				chatBuilder.renderData,
				'chat/chat-active-effect',
				{
					effect: this,
					description: this.description,
				},
				CHECK_FLAVOR,
			);
			await CommonEvents.renderMessage(chatBuilder.renderData, actor, item ?? this);
			await chatBuilder.withFlags(flags).create();
		}

		/**
		 * @private
		 * @override
		 * @remarks Unlike `_onCreate`, is managed by the GM.
		 */
		async _preCreate(data, options, user) {
			console.debug(`Created active effect ${this.name} on ${this.parent.name ?? 'unknown'} with origin: ${this.origin}, source: ${this.sourceInfo ? this.sourceInfo.name : ''}`);
			const changes = {
				name: game.i18n.localize(data.name),
				[`system.duration.remaining`]: this.system.duration.interval,
			};
			// TODO: Verify this is okay

			if (this.parent instanceof Item && this.img === defaultImage) {
				changes.img = this.parent.img;
			}
			// If no source info is provided, it could have been created directly
			if (!data.flags?.projectfu?.source && data.origin) {
				/** @type FUItem **/
				const compendiumItem = await fromUuid(data.origin);
				const sourceInfo = new InlineSourceInfo(compendiumItem.name, null, compendiumItem.uuid, null, compendiumItem.system.fuid);
				const flags = Pipeline.initializedFlags(Flags.ActiveEffect.Source, sourceInfo);
				changes.flags = flags;
			}

			this.updateSource(changes);
			return super._preCreate(data, options, user);
		}
	};
}
