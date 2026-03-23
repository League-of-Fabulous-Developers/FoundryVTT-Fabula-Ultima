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
			name: new fields.StringField({ initial: `` }),
			description: new fields.StringField({ initial: `` }),
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
 * @property {CodexEntryDataModel[]} characters
 * @property {CodexEntryDataModel[]} locations
 * @property {CodexEntryDataModel[]} factions
 * @property {CodexEntryDataModel[]} lore
 */
export class CodexDataModel extends VersionedDataModel {
	static CURRENT_VERSION = 1;
	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			characters: new fields.ArrayField(new fields.EmbeddedDataField(CodexEntryDataModel), {}),
			locations: new fields.ArrayField(new fields.EmbeddedDataField(CodexEntryDataModel), {}),
			factions: new fields.ArrayField(new fields.EmbeddedDataField(CodexEntryDataModel), {}),
			lore: new fields.ArrayField(new fields.EmbeddedDataField(CodexEntryDataModel), {}),
		});
	}

	/**
	 * @returns {CodexEntryDataModel[]} All entries among categories.
	 */
	get entries() {
		return [...this.characters, ...this.locations, ...this.factions, ...this.lore];
	}

	/**
	 * @param {String} name
	 * @returns {CodexEntryDataModel}
	 */
	resolveEntry(name) {
		for (const entry of this.entries) {
			if (entry.name === name) {
				return entry;
			}
		}
		return null;
	}
}
