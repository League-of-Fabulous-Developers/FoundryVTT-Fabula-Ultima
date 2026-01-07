import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} asset
 * @property {Number} volume
 */
export class PlaySoundEffectRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'playSoundEffectRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			asset: new fields.FilePathField({ categories: ['AUDIO'] }),
			volume: new fields.NumberField({ required: true, nullable: false, min: 0, max: 1, initial: 0.5 }),
		});
	}

	static get localization() {
		return 'FU.RuleActionPlaySoundEffect';
	}

	static get template() {
		return systemTemplatePath('effects/actions/play-sound-effect-rule-action');
	}

	async execute(context, selected) {
		if (this.asset) {
			// eslint-disable-next-line no-undef
			AudioHelper.play({ src: this.asset, volume: this.volume, loop: false }, true);
		}
	}
}
