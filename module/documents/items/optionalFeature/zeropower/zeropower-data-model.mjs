import { OptionalFeatureDataModel } from '../optional-feature-data-model.mjs';
import { ProgressDataModel } from '../../common/progress-data-model.mjs';

/**
 * @extends OptionalFeatureDataModel
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {boolean} hasClock.value
 * @property {ProgressDataModel} progress
 * @property {string} zeroTrigger.value
 * @property {string} zeroTrigger.description
 * @property {string} zeroEffect.value
 * @property {string} zeroEffect.description
 * @property {string} source.value
 */
export class ZeroPowerDataModel extends OptionalFeatureDataModel {
    static defineSchema() {
        const { SchemaField, StringField, HTMLField, EmbeddedDataField } = foundry.data.fields;
        return {
            progress: new EmbeddedDataField(ProgressDataModel, {}),
            zeroTrigger: new SchemaField({
                value: new StringField(),
                description: new HTMLField(),
            }),
            zeroEffect: new SchemaField({
                value: new StringField(),
                description: new HTMLField(),
            }),
        };
    }

    static get template() {
        return 'systems/projectfu/templates/optional/zeropower/feature-zeroPower-sheet.hbs';
    }

    static get previewTemplate() {
        return 'systems/projectfu/templates/optional/zeropower/feature-zeroPower-preview.hbs';
    }

    static get translation() {
        return 'FU.Limit';
    }
}
