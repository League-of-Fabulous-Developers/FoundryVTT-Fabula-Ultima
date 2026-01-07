import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {Number} tokenScale
 * @property {String} tokenImage Path to the image
 * @property {FUCommand} command
 */
export class UpdateTokenRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'updateTokenRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			command: new fields.StringField({
				initial: 'update',
				choices: Object.keys(FU.commandAction),
				required: true,
			}),
			tokenScale: new fields.NumberField({ blank: true }),
			tokenImage: new fields.FilePathField({ categories: ['IMAGE'] }),
		});
	}

	static get localization() {
		return 'FU.RuleActionUpdateToken';
	}

	static get template() {
		return systemTemplatePath('effects/actions/update-token-rule-action');
	}

	async execute(context, selected) {
		for (const character of selected) {
			if (character.token.document) {
				let update = {};
				if (this.command === 'update') {
					if (this.tokenScale && this.tokenScale !== 0) {
						update.width = update.height = this.tokenScale;
					}
					if (this.tokenImage) {
						update['texture.src'] = this.tokenImage;
					}
				} else if (this.command === 'reset') {
					if (character.actor.prototypeToken) {
						const prototypeToken = character.actor.prototypeToken;
						update.width = prototypeToken.width;
						update.height = prototypeToken.height;
						update['texture.src'] = prototypeToken.texture.src;
					}
				}

				await character.token.document.update(update);
			}
		}
	}
}
