import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} asset
 * @property {Number} volume
 */
export class PlaySoundEffectRuleAction extends RuleActionDataModel {
	static defineSchema() {
		return {
			asset: new fields.FilePathField({ categories: ['AUDIO'] }),
			volume: new fields.NumberField({ required: true, nullable: false, min: 0, max: 1, initial: 0.5, step: 0.05 }),
		};
	}

	static get localization() {
		return 'FU.RuleActionPlaySoundEffect';
	}

	static get template() {
		return systemTemplatePath('effects/actions/play-sound-effect-rule-action');
	}

	async execute(context, selected) {
		if (this.asset) {
			/* We are not awaiting because network may be unreliable and loading of the sound may fail */
			game.audio.play(this.asset, { volume: this.volume, loop: false, context: game.audio.environment }).catch((reason) => {
				console.error(`Unable to play sound effect '${this.asset}'`, reason);
			});
		}
	}
}
