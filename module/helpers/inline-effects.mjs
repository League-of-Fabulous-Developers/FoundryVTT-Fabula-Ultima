import { statusEffects } from '../documents/effects/statuses.mjs';
import { Effects, disableStatusEffect } from '../pipelines/effects.mjs';
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

/**
 * @type {TextEditorEnricherConfig}
 */
const enricher = {
	id: 'InlineEffect',
	// ID|UUID|Base64String
	pattern: InlineHelper.compose('EFFECT', '(?<id>[a-zA-Z0-9+/.-]+={0,3})', configurationPropertyGroups),
	enricher: inlineEffectEnricher,
	onRender: onRender,
};

function createEffectAnchor(effect, label) {
	const anchor = document.createElement('a');
	anchor.draggable = true;
	anchor.dataset.effect = InlineHelper.toBase64(effect);
	anchor.classList.add('inline', INLINE_EFFECT_CLASS, 'disable-how-to');
	anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.ChatApplySelected')} (${effect.name})<br>${game.i18n.localize('FU.ChatDisableSelected')}`);
	const icon = document.createElement('i');
	icon.classList.add('fue', 'fu-effect-placeholder');
	anchor.append(icon);
	anchor.append(label ? label : effect.name);
	return anchor;
}

function createCompendiumEffectAnchor(effect, config, label) {
	const anchor = document.createElement('a');
	anchor.draggable = true;
	anchor.dataset.effect = InlineHelper.toBase64(effect);
	anchor.dataset.uuid = effect.uuid;
	anchor.dataset.config = InlineHelper.toBase64(config);
	anchor.classList.add('inline', INLINE_EFFECT_CLASS, 'disable-how-to');
	anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.ChatApplySelected')} (${effect.name})<br>${game.i18n.localize('FU.ChatDisableSelected')}`);
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
	anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.ChatApplySelected')} (${localizedName})<br>${game.i18n.localize('FU.ChatDisableSelected')}`);

	InlineHelper.appendImageToAnchor(anchor, status.img);
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
			case 'eos':
				event = 'endOfScene';
				break;
			case 'rest':
				event = 'rest';
				break;
		}
	}
	const interval = match.groups.interval;
	const tracking = match.groups.tracking;
	const label = match.groups.label;
	return {
		event: event,
		interval: interval,
		tracking: tracking,
		name: label,
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
			return createEffectAnchor(decodedEffect, label);
		}
	}

	return createBrokenAnchor();
}

/**
 * @param {HTMLElement} element
 * @returns {Promise<void>}
 */
async function onRender(element) {
	const target = element.firstElementChild;
	const document = InlineHelper.resolveDocument(element);
	const sourceInfo = InlineHelper.determineSource(document, target);
	const dataset = target.dataset;

	const effectData = InlineHelper.fromBase64(dataset.effect);
	const status = dataset.status;
	const config = InlineHelper.fromBase64(dataset.config);

	// Click handler
	element.addEventListener('click', async function (event) {
		const isCtrlClick = event.ctrlKey;
		const targets = await targetHandler();
		if (!targets.length) return;

		targets.forEach((actor) => {
			if (effectData) {
				if (isCtrlClick) {
					Effects.onRemoveEffectFromActor(actor, sourceInfo, effectData);
				} else {
					Effects.onApplyEffectToActor(actor, effectData, sourceInfo, config);
				}
			} else if (status) {
				if (isCtrlClick) {
					disableStatusEffect(actor, status);
				} else if (!actor.statuses.has(status)) {
					Effects.toggleStatusEffect(actor, status, sourceInfo, config);
				}
			}
		});
	});

	// Dragstart handler
	element.addEventListener('dragstart', function (event) {
		const data = {
			type: INLINE_EFFECT,
			sourceInfo: sourceInfo,
			config: InlineHelper.fromBase64(dataset.config),
			effect: InlineHelper.fromBase64(dataset.effect),
			status: dataset.status,
		};

		event.dataTransfer.setData('text/plain', JSON.stringify(data));
		event.stopPropagation();
	});

	// Contextmenu handler
	element.addEventListener('contextmenu', function (event) {
		event.preventDefault();
		event.stopPropagation();

		let effectData;
		if (dataset.status) {
			const status = dataset.status;
			const statusEffect = CONFIG.statusEffects.find((value) => value.id === status);
			if (statusEffect) {
				effectData = { ...statusEffect, statuses: [status] };
			}
		} else {
			effectData = InlineHelper.fromBase64(dataset.effect);
		}

		if (effectData) {
			effectData.sourceInfo = sourceInfo;

			const cls = getDocumentClass('ActiveEffect');
			delete effectData.id;

			cls.migrateDataSafe(effectData);
			cls.cleanData(effectData);

			Actor.create({ name: 'Temp Actor', type: 'character' }, { temporary: true })
				.then((value) => cls.create(effectData, { temporary: true, render: true, parent: value }))
				.then((value) => {
					const activeEffectConfig = new foundry.applications.sheets.ActiveEffectConfig(value);
					activeEffectConfig.render(true, { editable: false });
				});
		}
	});
}

async function onDropActor(actor, sheet, { type, sourceInfo, config, effect, status }) {
	if (type === INLINE_EFFECT) {
		if (status) {
			if (!actor.statuses.has(status)) {
				Effects.toggleStatusEffect(actor, status, sourceInfo, config);
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

/**
 * @type {FUInlineCommand}
 */
export const InlineEffects = {
	enrichers: [enricher],
	showEffectConfiguration,
	parseConfigData,
	onDropActor,
	configurationPropertyGroups,
};
