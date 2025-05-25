import { FU } from './config.mjs';
import { InlineHelper, InlineSourceInfo } from './inline-helper.mjs';
import { targetHandler } from './target-handler.mjs';
import { CharacterDataModel } from '../documents/actors/character/character-data-model.mjs';
import { NpcDataModel } from '../documents/actors/npc/npc-data-model.mjs';
import { Effects } from '../pipelines/effects.mjs';

// TODO: Remove, as its been replaced by `@TYPE[affinity...]`

const INLINE_DATA_TYPE = 'InlineAffinity';
const className = `inline-affinity`;

/**
 * @type {TextEditorEnricherConfig}
 */
const editorEnricher = {
	pattern: /@AFFINITY\[\s*(?<type>\w+)\s(?<value>\w+)]/g,
	enricher: (match, options) => {
		const type = match.groups.type.toLowerCase();
		const value = match.groups.value;

		if (type && type in FU.damageTypes && value in FU.affValue) {
			const anchor = document.createElement('a');
			anchor.classList.add('inline', className);
			anchor.draggable = true;
			anchor.dataset.type = type;
			anchor.dataset.value = value;
			// TOOLTIP
			anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.InlineAffinity')} (${type})`);
			// TYPE
			const localizedType = game.i18n.localize(FU.damageTypes[type]);
			const localizedValue = game.i18n.localize(FU.affType[FU.affValue[value]]);
			anchor.append(`${localizedType} ${localizedValue}`);
			// ICON
			const icon = document.createElement('i');
			icon.className = FU.affIcon[type] ?? '';
			anchor.append(icon);
			return anchor;
		}

		return null;
	},
};

/**
 * @param {ChatMessage} document
 * @param {HTMLElement} html
 */
function activateListeners(document, html) {
	if (document instanceof DocumentSheet) {
		document = document.document;
	}

	const affinityLinks = html.querySelectorAll('a.inline.inline-affinity[draggable]');
	for (const el of affinityLinks) {
		// Click handler
		el.addEventListener('click', async function () {
			const targets = await targetHandler();
			if (targets.length > 0) {
				const sourceInfo = InlineHelper.determineSource(document, this);
				const type = this.dataset.type;
				const value = this.dataset.value;

				for (const target of targets) {
					await applyEffect(target, sourceInfo, type, value);
				}
			}
		});

		// Drag handler
		el.addEventListener('dragstart', function (event) {
			if (!(this instanceof HTMLElement) || !event.dataTransfer) {
				return;
			}

			const sourceInfo = InlineHelper.determineSource(document, this);
			const data = {
				type: INLINE_DATA_TYPE,
				sourceInfo: sourceInfo,
				affinity: this.dataset.type,
				value: this.dataset.value,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
	}
}

async function onDropActor(actor, sheet, { type, sourceInfo, affinity, value, ignore }) {
	if (type === INLINE_DATA_TYPE) {
		sourceInfo = InlineSourceInfo.fromObject(sourceInfo);
		await applyEffect(actor, sourceInfo, affinity, value);
		return false;
	}
}

/**
 * @param {String} type
 * @param {String} value
 * @returns {ActiveEffectData}
 */
function createEffect(type, value) {
	const localizedType = game.i18n.localize(FU.damageTypes[type]);
	const attributeKey = `system.affinities.${type}.current`;
	const attributeValue = FU.affValue[value];
	const localizedValue = game.i18n.localize(FU.affType[attributeValue]);
	const name = `${localizedType} ${localizedValue}`;
	/** @type Number **/

	return {
		fuid: `${type}-${value}`,
		name: name,
		img: `systems/projectfu/styles/static/affinities/${type}.svg`,
		transfer: false,
		changes: attributeKey
			? [
					{
						key: attributeKey,
						mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
						value: attributeValue,
					},
				]
			: [],
	};
}

/**
 * @param {FUActor} actor
 * @param {InlineSourceInfo} sourceInfo
 * @param {String} type
 * @param {String} value
 *
 */
async function applyEffect(actor, sourceInfo, type, value) {
	if (actor.system instanceof CharacterDataModel || actor.system instanceof NpcDataModel) {
		const effectData = createEffect(type, value);
		Effects.onApplyEffectToActor(actor, effectData, sourceInfo).then((effect) => {
			console.info(`Created effect: ${effect.uuid} on actor uuid: ${actor.uuid}`);
		});
	} else {
		ui.notifications.error('FU.ChatApplyNoCharacterSelected', { localize: true });
	}
}

export const InlineAffinity = {
	enricher: editorEnricher,
	activateListeners,
	onDropActor,
};
