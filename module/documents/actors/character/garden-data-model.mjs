import { LocallyEmbeddedDocumentField } from '../../items/classFeature/locally-embedded-document-field.mjs';
import { FUItem } from '../../items/item.mjs';
import { FUActor } from '../actor.mjs';
import { ClassFeatureTypeDataModel } from '../../items/classFeature/class-feature-type-data-model.mjs';
import { MagiseedDataModel } from '../../items/classFeature/floralist/magiseed-data-model.mjs';
import { MiscAbilityDataModel } from '../../items/misc/misc-ability-data-model.mjs';

async function onRenderFUItemSheet(sheet, html, data) {
	if (sheet.item.type === 'miscAbility' && sheet.item.actor && sheet.item.actor.system.garden) {
		const item = sheet.item;
		const actor = item.actor;
		html.find('.sheet-body .tab.attributes .title-fieldset:first-child .item-settings').append(`
<label class="checkbox resource-label-sm">
    <span>${game.i18n.localize('FU.ClassFeatureMagiseedGardenIsGrowthClock')}</span>
    <input type="checkbox" data-action="toggleGrowthClock" ${actor.system.garden.clock === item ? 'checked' : ''}>
</label>`);
		html.find('[data-action="toggleGrowthClock"]').on('click', () => {
			if (actor.system.garden.clock === item) {
				actor.update({
					'system.garden.clock': null,
				});
			} else {
				actor.update({
					'system.garden.clock': item.id,
				});
			}
			return false;
		});
	}
}

Hooks.on('renderFUItemSheet', onRenderFUItemSheet);

export class GardenDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		return {
			planted: new LocallyEmbeddedDocumentField(FUItem, FUActor, {
				validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof MagiseedDataModel,
			}),
			clock: new LocallyEmbeddedDocumentField(FUItem, FUActor, {
				validate: (doc) => doc.system instanceof MiscAbilityDataModel && doc.system.hasClock.value,
			}),
		};
	}

	async plantMagiseed(magiseed) {
		if (this.isMagiseed(magiseed)) {
			await this.parent.actor.update({
				'system.garden.planted': magiseed.id,
			});
		} else {
			ui.notifications.error('Could not plant.');
			console.error('Could not plant.', magiseed);
		}
	}

	async removeMagiseed() {
		await this.parent.actor.update({
			'system.garden.planted': null,
		});
	}

	isMagiseed(magiseed) {
		return magiseed instanceof FUItem && magiseed.system instanceof ClassFeatureTypeDataModel && magiseed.system.data instanceof MagiseedDataModel;
	}
}
