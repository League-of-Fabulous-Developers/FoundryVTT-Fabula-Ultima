import { FU } from './config.mjs';
import { InlineHelper } from './inline-helper.mjs';
import { targetHandler } from './target-handler.mjs';
import { CharacterDataModel } from '../documents/actors/character/character-data-model.mjs';
import { NpcDataModel } from '../documents/actors/npc/npc-data-model.mjs';
import { Effects } from '../pipelines/effects.mjs';

const dataType = 'InlineWeapon';
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
			const affValue = FU.affValue[value];
			const localizedValue = game.i18n.localize(FU.affType[affValue]);
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
 * @param {ClientDocument} document
 * @param {jQuery} html
 */
function activateListeners(document, html) {
	if (document instanceof DocumentSheet) {
		document = document.document;
	}

	html.find(`a.inline.inline-affinity[draggable]`)
		.on('click', async function () {
			let targets = await targetHandler();
			if (targets.length > 0) {
				const sourceInfo = InlineHelper.determineSource(document, this);
				const type = this.dataset.type;
				const value = this.dataset.value;

				targets.forEach(async (target) => {
					await applyEffect(target, sourceInfo, type, value);
				});
			}
		})
		.on('dragstart', function (event) {
			/** @type DragEvent */
			event = event.originalEvent;
			if (!(this instanceof HTMLElement) || !event.dataTransfer) {
				return;
			}

			const sourceInfo = InlineHelper.determineSource(document, this);
			const data = {
				type: dataType,
				sourceInfo: sourceInfo,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
}

/**
 * @param {String} type
 * @param {String} value
 * @returns {ActiveEffectData}
 */
function createEffect(type, value) {
	const attributeKey = `system.affinities.${type}.current`;
	/** @type Number **/
	const localizedType = game.i18n.localize(FU.damageTypes[type]);
	const affValue = FU.affValue[value];
	const localizedValue = game.i18n.localize(FU.affType[affValue]);

	return {
		fuid: `${type}-${value}`,
		name: `${localizedType} ${localizedValue}`,
		img: `systems/projectfu/styles/static/affinities/${type}.svg`,
		transfer: false,
		changes: attributeKey
			? [
					{
						key: attributeKey,
						mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
						value: affValue,
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
		const source = sourceInfo.resolve();
		const effectData = createEffect(type, value);
		Effects.onApplyEffectToActor(actor, source?.uuid, effectData).then((effect) => {
			console.info(`Created effect: ${effect.uuid} on actor uuid: ${actor.uuid}`);
		});
	} else {
		ui.notifications.error('FU.ChatApplyNoCharacterSelected', { localize: true });
	}
}

function onDropActor(actor, sheet, { type, sourceInfo, ignore }) {
	if (type === dataType) {
		return false;
	}
}

export const InlineAffinity = {
	enricher: editorEnricher,
	activateListeners,
	onDropActor,
};
