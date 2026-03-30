import { VersionedDataModel } from '../../../fields/versioned-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { systemAssetPath } from '../../../helpers/system-utils.mjs';
import { StringUtils } from '../../../helpers/string-utils.mjs';
import { AudioDataModel } from '../../../fields/audio-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} name
 * @property {String} description User-facing description.
 * @property {String} notes GM-only notes.
 * @property {String} img The path to the image.
 * @property {String[]} tags
 * @property {AudioDataModel} audio
 * @property {Boolean} hidden
 */
export class CodexEntryDataModel extends foundry.abstract.DataModel {
	static DEFAULT_IMAGE_PATH = systemAssetPath('ui/codex-entry.svg'); //'icons/svg/mystery-man.svg';

	static defineSchema() {
		return {
			name: new fields.StringField({ initial: `` }),
			description: new fields.StringField({ initial: `` }),
			img: new fields.FilePathField({ categories: ['IMAGE'], initial: CodexEntryDataModel.DEFAULT_IMAGE_PATH }),
			audio: new fields.EmbeddedDataField(AudioDataModel),
			tags: new fields.ArrayField(new fields.StringField(), {}),
			notes: new fields.StringField({ initial: `` }),
			hidden: new fields.BooleanField(),
		};
	}

	static migrateData(source) {
		if (!source.img) source.img = CodexEntryDataModel.DEFAULT_IMAGE_PATH;
		return super.migrateData(source);
	}

	/**
	 * @param {Boolean} broadcast Whether to play the sound for all connected clients.
	 * @returns {Promise<PlaylistSound|undefined>}
	 */
	async playSound({ broadcast = false } = {}) {
		if (!this.audio.path) return;

		// Find or create a dedicated playlist for this module
		const playlistName = `Fabula Ultima - ${StringUtils.localize('FU.Codex')}`;
		let playlist = game.playlists.getName(playlistName);
		if (!playlist) {
			// eslint-disable-next-line no-undef
			playlist = await Playlist.create({
				name: playlistName,
				mode: CONST.PLAYLIST_MODES.DISABLED, // manual control only
			});
		}

		// Check if this sound is already in the playlist
		let sound = playlist.sounds.find((s) => s.path === this.audio.path);
		if (!sound) {
			// eslint-disable-next-line no-undef
			sound = await PlaylistSound.create(
				{
					name: this.name, // this.path.split('/').pop(), // filename as name
					path: this.audio.path,
					volume: this.audio.volume,
					repeat: this.audio.repeat,
					fade: this.audio.fade,
					channel: this.audio.channel,
				},
				{ parent: playlist },
			);
		} else {
			await sound.update({
				name: this.name,
				volume: this.audio.volume,
				repeat: this.audio.repeat,
				fade: this.audio.fade,
				channel: this.audio.channel,
			});
		}

		// Play via the playlist, which handles broadcast automatically
		return playlist.playSound(sound);
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
				initial: CodexDataModel.getDefaultTags(),
			}),
		});
	}

	/**
	 * @returns {String[]}
	 */
	static getDefaultTags() {
		return Object.entries(FU.codexTags).map(([key, value]) => {
			if (StringUtils.hasLocalization(key)) {
				return StringUtils.localize(value).toLowerCase();
			}
			return key;
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
