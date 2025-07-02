import { FUItem } from '../../items/item.mjs';
import { FUActor } from '../actor.mjs';
import { ClassFeatureTypeDataModel } from '../../items/classFeature/class-feature-type-data-model.mjs';
import { MagiseedDataModel } from '../../items/classFeature/floralist/magiseed-data-model.mjs';
import { GardenDataModel } from '../../items/classFeature/floralist/garden-data-model.mjs';
import { LocallyEmbeddedDocumentField } from '../../../fields/locally-embedded-document-field.mjs';

/**
 * @property {FUItem} planted
 * @property {FUItem} garden
 */
export class FloralistDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		return {
			planted: new LocallyEmbeddedDocumentField(FUItem, FUActor, {
				validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof MagiseedDataModel,
			}),
			garden: new LocallyEmbeddedDocumentField(FUItem, FUActor, {
				validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof GardenDataModel,
			}),
		};
	}

	async togglePlantedMagiseed(magiseed) {
		if (this.#isMagiseed(magiseed)) {
			if (this.planted === magiseed) {
				await this.parent.actor.update({
					'system.floralist.planted': null,
				});
				return magiseed.system.data.postRemoved();
			} else {
				await this.parent.actor.update({
					'system.floralist.planted': magiseed.id,
				});
				return magiseed.system.data.postPlanted();
			}
		} else {
			ui.notifications.error('Could not plant.');
			console.error('Could not plant.', magiseed);
		}
	}

	#isMagiseed(magiseed) {
		return magiseed instanceof FUItem && magiseed.system instanceof ClassFeatureTypeDataModel && magiseed.system.data instanceof MagiseedDataModel;
	}

	async toggleActiveGarden(garden) {
		if (this.#isGarden(garden)) {
			if (this.garden === garden) {
				await this.parent.actor.update({
					'system.floralist.garden': null,
				});
			} else {
				await this.parent.actor.update({
					'system.floralist.garden': garden.id,
				});
			}
		} else {
			ui.notifications.error('Not a valid garden.');
			console.error('Not a valid garden.', garden);
		}
	}

	#isGarden(garden) {
		return garden instanceof FUItem && garden.system instanceof ClassFeatureTypeDataModel && garden.system.data instanceof GardenDataModel;
	}
}
