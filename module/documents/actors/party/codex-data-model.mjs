import { VersionedDataModel } from '../../../fields/versioned-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} name
 * @property {String} description User-facing description.
 * @property {String} notes GM-only notes.
 * @property {String} img The path to the image.
 * @property {String[]} tags
 * @property {Boolean} hidden
 */
export class CodexEntryDataModel extends foundry.abstract.DataModel {
	static DEFAULT_IMAGE_PATH = 'icons/svg/mystery-man.svg';

	static defineSchema() {
		return {
			name: new fields.StringField({ initial: `` }),
			description: new fields.StringField({ initial: `` }),
			img: new fields.FilePathField({ categories: ['IMAGE'], initial: CodexEntryDataModel.DEFAULT_IMAGE_PATH }),
			tags: new fields.ArrayField(new fields.StringField(), {}),
			notes: new fields.StringField({ initial: `` }),
			hidden: new fields.BooleanField(),
		};
	}

	static migrateData(source) {
		if (!source.img) source.img = CodexEntryDataModel.DEFAULT_IMAGE_PATH;
		return super.migrateData(source);
	}
}

/**
 * @desc Represents data about an ongoing campaign.
 * @property {CodexEntryDataModel[]} entries
 * @property {String[]} tags
 */
export class CodexDataModel extends VersionedDataModel {
	static CURRENT_VERSION = 1;
	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			entries: new fields.ArrayField(new fields.EmbeddedDataField(CodexEntryDataModel), {}),
			tags: new fields.ArrayField(new fields.StringField({ initial: '', nullable: false, blank: true }), {
				initial: Object.keys(FU.codexTags),
			}),
		});
	}

	/**
	 * @param {String} name
	 * @returns {CodexEntryDataModel}
	 */
	resolveEntry(name) {
		name = name.toLowerCase();
		for (const entry of this.entries) {
			if (entry.name.toLowerCase() === name) {
				return entry;
			}
		}
		return null;
	}
}
