import { statusEffects } from '../documents/effects/statuses.mjs';
import { Effects, disableStatusEffect } from '../pipelines/effects.mjs';
import { targetHandler } from './target-handler.mjs';
import { InlineEffectConfiguration } from './inline-effect-configuration.mjs';
import { InlineHelper } from './inline-helper.mjs';
import { FUItem } from '../documents/items/item.mjs';
import { StringUtils } from './string-utils.mjs';

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

/**
 * @param effect
 * @param label
 * @returns {HTMLAnchorElement}
 */
function createEffectAnchor(effect, label) {
	const anchor = document.createElement('a');
	anchor.draggable = true;
	anchor.dataset.effect = StringUtils.toBase64(effect);
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
	anchor.dataset.effect = StringUtils.toBase64(effect);
	anchor.dataset.uuid = effect.uuid;
	anchor.dataset.fuid = effect.parent.system.fuid;
	anchor.dataset.config = StringUtils.toBase64(config);
	anchor.classList.add('inline', INLINE_EFFECT_CLASS, 'disable-how-to');
	anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.ChatApplySelected')} (${effect.name})<br>${game.i18n.localize('FU.ChatDisableSelected')}`);
	InlineHelper.appendImage(anchor, effect.img);
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
	anchor.dataset.config = StringUtils.toBase64(config);
	anchor.classList.add('inline', INLINE_EFFECT_CLASS, 'disable-how-to');
	const localizedName = game.i18n.localize(status.name);
	anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.ChatApplySelected')} (${localizedName})<br>${game.i18n.localize('FU.ChatDisableSelected')}`);

	InlineHelper.appendImage(anchor, status.img);
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
		const decodedEffect = StringUtils.fromBase64(id);
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

	const effectData = StringUtils.fromBase64(dataset.effect);
	const status = dataset.status;
	const config = StringUtils.fromBase64(dataset.config);

	// Click handler
	element.addEventListener('click', async function (event) {
		const isCtrlClick = event.ctrlKey;
		const targets = await targetHandler();
		if (!targets.length) return;

		targets.forEach((actor) => {
			if (effectData) {
				if (isCtrlClick) {
					Effects.removeEffect(actor, sourceInfo, effectData);
				} else {
					Effects.applyEffect(actor, effectData, sourceInfo, config);
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
			config: StringUtils.fromBase64(dataset.config),
			effect: StringUtils.fromBase64(dataset.effect),
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
			effectData = StringUtils.fromBase64(dataset.effect);
		}

		if (effectData) {
			effectData.sourceInfo = sourceInfo;

			const tempActor = new foundry.documents.Actor.implementation({ name: 'Temp Actor', type: 'character' });
			const tempEffect = new foundry.documents.ActiveEffect.implementation(effectData, { temporary: true, parent: tempActor });
			const ActiveEffectSheetClass = tempEffect._getSheetClass();
			const sheet = new ActiveEffectSheetClass({ document: tempEffect, editable: false });
			sheet.render({ force: true });
		}
	});
}

async function onDropActor(actor, sheet, { type, sourceInfo, config, effect, status }) {
	if (type === INLINE_EFFECT) {
		if (status) {
			if (!actor.statuses.has(status)) {
				await Effects.toggleStatusEffect(actor, status, sourceInfo, config);
			}
		} else if (effect) {
			await Effects.applyEffect(actor, effect, sourceInfo, config);
		}
		return false;
	}
}

function showEffectConfiguration(state, dispatch, view) {
	new InlineEffectConfiguration(state, dispatch).render(true);
}

export const InlineEffects = Object.freeze({
	enrichers: [enricher],
	showEffectConfiguration,
	parseConfigData,
	onDropActor,
	configurationPropertyGroups,
	createEffectAnchor,
});
