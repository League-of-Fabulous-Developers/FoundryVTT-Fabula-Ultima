import { VersionedDataModel } from '../../../fields/versioned-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} name
 * @property {String} description
 * @property {String} img The path to the image.
 */
export class CodexEntryDataModel extends foundry.abstract.DataModel {
	static DEFAULT_IMAGE_PATH = 'icons/svg/mystery-man.svg';

	static defineSchema() {
		return {
			name: new fields.StringField(),
			description: new fields.StringField(),
			img: new fields.FilePathField({ categories: ['IMAGE'], initial: CodexEntryDataModel.DEFAULT_IMAGE_PATH }),
		};
	}

	static migrateData(source) {
		if (!source.img) source.img = CodexEntryDataModel.DEFAULT_IMAGE_PATH;
		return super.migrateData(source);
	}
}

/**
 * @desc Represents data about an ongoing campaign.
 */
export class CodexDataModel extends VersionedDataModel {
	static CURRENT_VERSION = 1;
	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			factions: new fields.ArrayField(new fields.EmbeddedDataField(CodexEntryDataModel), {}),
			locations: new fields.ArrayField(new fields.EmbeddedDataField(CodexEntryDataModel), {}),
			characters: new fields.ArrayField(new fields.EmbeddedDataField(CodexEntryDataModel), {}),
		});
	}
}
