import { statusEffects } from '../documents/effects/statuses.mjs';
import { Effects, toggleStatusEffect } from '../pipelines/effects.mjs';
import { targetHandler } from './target-handler.mjs';
import { InlineEffectConfiguration } from './inline-effect-configuration.mjs';
import { InlineHelper } from './inline-helper.mjs';
import { FUItem } from '../documents/items/item.mjs';

const INLINE_EFFECT = 'InlineEffect';
const INLINE_EFFECT_CLASS = 'inline-effect';

/**
 * @typedef InlineEffectConfig
 * @property {"status", "boonOrBane", "custom"} type
 * @property {'dazed', 'enraged', 'poisoned', 'shaken', 'slow', 'weak'} status
 * @property {GuidedInlineEffectConfig} guided
 */

const configurationPropertyGroups = [InlineHelper.propertyPattern('event', 'e', '\\w+'), InlineHelper.propertyPattern('interval', 'i', '\\d'), InlineHelper.propertyPattern('tracking', 't', '\\w+')];

const enricher = {
	pattern: InlineHelper.compose('EFFECT', '(?<id>[a-zA-Z0-9+/.-]*)', configurationPropertyGroups),
	enricher: inlineEffectEnricher,
};

function createEffectAnchor(effect) {
	const anchor = document.createElement('a');
	anchor.draggable = true;
	anchor.dataset.effect = InlineHelper.toBase64(effect);
	anchor.classList.add('inline', INLINE_EFFECT_CLASS, 'disable-how-to');
	anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.ChatApplySelected')} (${effect.name})`);
	const icon = document.createElement('i');
	icon.classList.add('fue', 'fu-effect-placeholder');
	anchor.append(icon);
	anchor.append(effect.name);
	return anchor;
}

function createCompendiumEffectAnchor(effect, config, label) {
	const anchor = document.createElement('a');
	anchor.draggable = true;
	anchor.dataset.effect = InlineHelper.toBase64(effect);
	anchor.dataset.uuid = effect.uuid;
	anchor.dataset.config = InlineHelper.toBase64(config);
	anchor.classList.add('inline', INLINE_EFFECT_CLASS, 'disable-how-to');
	anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.ChatApplySelected')} (${effect.name})`);
	InlineHelper.appendImageToAnchor(anchor, effect.img);
	anchor.append(label ? label : effect.name);
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

function createStatusAnchor(effectValue, status, config) {
	const anchor = document.createElement('a');
	anchor.draggable = true;
	anchor.dataset.status = effectValue;
	anchor.dataset.config = InlineHelper.toBase64(config);
	anchor.classList.add('inline', INLINE_EFFECT_CLASS, 'disable-how-to');
	const localizedName = game.i18n.localize(status.name);
	anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.ChatApplySelected')} (${localizedName})`);
	const icon = document.createElement('i');
	const statusClass = `fu-${effectValue}`;
	icon.classList.add('fue', statusClass);
	anchor.append(icon);
	anchor.append(localizedName);
	return anchor;
}

/**
 * @param match
 * @returns {InlineEffectConfiguration}
 */
function parseConfigData(match) {
	let event = match.groups.event;
	if (event) {
		switch (event) {
			case 'eot':
				event = 'endOfTurn';
				break;
			case 'sot':
				event = 'startOfTurn';
				break;
			case 'eor':
				event = 'endOfRound';
				break;
		}
	}
	const interval = match.groups.interval;
	const tracking = match.groups.tracking;
	return {
		event: event,
		interval: interval,
		tracking: tracking,
	};
}

/**
 * @param {String} match
 * @param options
 */
async function inlineEffectEnricher(match, options) {
	/** @type String */
	const id = match.groups.id;
	const label = match.groups.label;
	const config = parseConfigData(match);

	if (id in Effects.STATUS_EFFECTS || id in Effects.BOONS_AND_BANES) {
		const status = statusEffects.find((value) => value.id === id);
		if (status) {
			return createStatusAnchor(id, status, config);
		}
	} else {
		/** @type ActiveEffect **/
		if (id.includes('.')) {
			let instancedEffect = await fromUuid(id);
			if (instancedEffect instanceof FUItem) {
				const firstEffect = instancedEffect.effects.entries().next().value[1];
				instancedEffect = firstEffect;
			}
			return createCompendiumEffectAnchor(instancedEffect, config, label);
		}

		// TODO: Deprecate someday
		const decodedEffect = InlineHelper.fromBase64(id);
		if (decodedEffect && decodedEffect.name && decodedEffect.changes) {
			return createEffectAnchor(decodedEffect);
		}
	}

	return createBrokenAnchor();
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
		.on('click', async function (event) {
			const sourceInfo = InlineHelper.determineSource(document, this);
			const effectData = InlineHelper.fromBase64(this.dataset.effect);
			const status = this.dataset.status;
			const config = InlineHelper.fromBase64(this.dataset.config);
			const isCtrlClick = event.ctrlKey;

			const targets = await targetHandler();
			if (!targets.length) return;
			targets.forEach((actor) => {
				if (effectData) {
					isCtrlClick ? Effects.onRemoveEffectFromActor(actor, sourceInfo, effectData) : Effects.onApplyEffectToActor(actor, effectData, sourceInfo, config);
				} else if (status) {
					isCtrlClick ? toggleStatusEffect(actor, status, sourceInfo, { disable: true }) : !actor.statuses.has(status) && toggleStatusEffect(actor, status, sourceInfo, config);
				}
			});
		})
		.on('dragstart', function (event) {
			/** @type DragEvent */
			event = event.originalEvent;
			if (!(event.target instanceof HTMLElement) || !event.dataTransfer) {
				return;
			}
			const sourceInfo = InlineHelper.determineSource(document, this);
			const data = {
				type: INLINE_EFFECT,
				sourceInfo: sourceInfo,
				config: InlineHelper.fromBase64(this.dataset.config),
				effect: InlineHelper.fromBase64(this.dataset.effect),
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
				effectData = InlineHelper.fromBase64(this.dataset.effect);
			}
			if (effectData) {
				const sourceInfo = InlineHelper.determineSource(document, this);
				effectData.sourceInfo = sourceInfo;
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

function onDropActor(actor, sheet, { type, sourceInfo, config, effect, status }) {
	if (type === INLINE_EFFECT) {
		if (status) {
			if (!actor.statuses.has(status)) {
				toggleStatusEffect(actor, status, sourceInfo, config);
			}
		} else if (effect) {
			Effects.onApplyEffectToActor(actor, effect, sourceInfo, config);
		}
		return false;
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
	parseConfigData,
	configurationPropertyGroups,
	initialize,
};
