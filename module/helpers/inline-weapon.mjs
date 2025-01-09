import { FU } from './config.mjs';
import { InlineHelper } from './inline-helper.mjs';
import { targetHandler } from './target-handler.mjs';
import { CharacterDataModel } from '../documents/actors/character/character-data-model.mjs';
import { ChooseWeaponDialog } from '../documents/items/skill/choose-weapon-dialog.mjs';
import { statusEffects } from './statuses.mjs';
import { Effects } from '../documents/effects/effects.mjs';

const INLINE_WEAPON = 'InlineWeapon';
const className = `inline-weapon`;

/**
 * @type {TextEditorEnricherConfig}
 */
const editorEnricher = {
	pattern: /@WEAPON\[(?<traits>.*?)\]/g,
	enricher: (match, options) => {
		const traits = match.groups.traits.split(' ');
		if (traits.length >= 1) {
			const anchor = document.createElement('a');
			anchor.classList.add('inline', className);
			anchor.draggable = true;
			anchor.dataset.traits = traits;
			// TOOLTIP
			anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.InlineWeapon')} (${traits})`);
			// TEXT
			anchor.text = traits.map(InlineHelper.capitalize).join(' ');
			// ICON
			const icon = document.createElement('i');
			icon.className = FU.allIcon.twoweapon;
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

	html.find(`a.inline.inline-weapon[draggable]`)
		.on('click', async function () {
			let targets = await targetHandler();
			if (targets.length > 0) {
				const sourceInfo = InlineHelper.determineSource(document, this);
				const traits = this.dataset.traits;
				targets.forEach(async (target) => {
					await applyTraitsToWeapon(target, sourceInfo, traits);
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
				type: INLINE_WEAPON,
				sourceInfo: sourceInfo,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
}

/**
 * @param {FUActor} actor
 * @param {InlineSourceInfo} sourceInfo
 * @param {string[]} traits
 */
async function applyTraitsToWeapon(actor, sourceInfo, traits) {
	if (actor.system instanceof CharacterDataModel) {
		const source = sourceInfo.resolve();
		const weapon = await ChooseWeaponDialog.prompt(actor);
		const effect = statusEffects[0];
		Effects.onApplyEffectToActor(weapon, source, effect);
		console.info(`Applied ${traits} from ${sourceInfo.name} to weapon '${weapon.uuid}' on actor '${actor.uuid}'`);
	} else {
		ui.notifications.error('FU.ChatApplyNoCharacterSelected', { localize: true });
	}
}

function onDropActor(actor, sheet, { type, sourceInfo, ignore }) {
	if (type === INLINE_WEAPON) {
		return false;
	}
}

export const InlineWeapon = {
	enricher: editorEnricher,
	activateListeners,
	onDropActor,
};
