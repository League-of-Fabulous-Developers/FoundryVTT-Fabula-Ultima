/**
 * @desc Used to hold data for audio playback.
 * @remarks Attempts to mirror Foundry's internal API (BasePlaylistSound).
 * @property {String} path
 * @property {Number} volume
 * @property {Boolean} repeat
 * @property {String} channel
 */
export class AudioDataModel extends foundry.abstract.DataModel {
	static CHANNELS = ['music', 'environment', 'interface'];

	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			path: new fields.FilePathField({ categories: ['AUDIO'], initial: '', blank: true }),
			volume: new fields.AlphaField({ initial: 0.25 }),
			repeat: new fields.BooleanField({ initial: false }),
			fade: new fields.NumberField({ initial: 0, min: 0 }),
			channel: new fields.StringField({ initial: 'environment', choices: AudioDataModel.CHANNELS }),
		};
	}
}
