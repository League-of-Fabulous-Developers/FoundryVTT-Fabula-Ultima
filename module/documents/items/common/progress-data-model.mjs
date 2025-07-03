/**
 * @description Models the tracking of progress, whether that be clocks or resources.
 * @property {string} name A label, used for user-facing displays.
 * @property {number} current The current value
 * @property {number} step The step size (a multiplier for each increment/decrement)
 * @property {number} max The maximum value
 * @property {Boolean} enabled Whether this progress track should be used
 * @property {string} id Optionally, a unique identifier for internal lookups.
 */
export class ProgressDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField, StringField, BooleanField } = foundry.data.fields;
		return {
			name: new StringField({ nullable: true }),
			id: new StringField({ nullable: true }),
			current: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
			step: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
			max: new NumberField({ initial: 6, min: 0, integer: true, nullable: false }),
			enabled: new BooleanField({ initial: false }),
		};
	}

	get isMinimum() {
		return this.current === 0;
	}

	get isMaximum() {
		return this.current === this.max;
	}

	get progressArray() {
		return ProgressDataModel.generateProgressArray(this);
	}

	/**
	 * @param {String} name
	 * @param {Number} max
	 * @returns {ProgressDataModel}
	 */
	static construct(name, max) {
		return new this({
			name: name,
			max: max,
		});
	}

	/**
	 * @param {ProgressDataModel} track
	 * @returns {{id, checked: boolean}[]}
	 */
	static generateProgressArray(track) {
		return Array.from({ length: track.max }, (_, i) => ({
			id: i + 1,
			checked: track.current === i + 1,
		})).reverse();
	}

	/**
	 * @param {FUActor} actor
	 * @param {ProgressDataModel} track
	 * @returns {Promise<void>}
	 */
	static async sendToChat(actor, track) {
		await ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor: actor }),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/partials/chat-clock-details.hbs', {
				arr: track.progressArray,
				data: track,
			}),
		});
	}

	/**
	 * @param {Document} document
	 * @param {String} propertyPath
	 * @param {Number} increment
	 * @param {Boolean} useMultiplier
	 * @returns {Promise<void>}
	 */
	static async updateForDocument(document, propertyPath, increment, useMultiplier) {
		/** @type ProgressDataModel **/
		const progress = foundry.utils.getProperty(document, propertyPath);
		const maxProgress = progress.max;

		let newProgress;

		if (useMultiplier) {
			const stepMultiplier = progress.step || 1;
			newProgress = progress.current + increment * stepMultiplier;
		} else {
			newProgress = progress.current + increment;
		}

		if (maxProgress !== 0) {
			newProgress = Math.min(newProgress, maxProgress);
		}

		const currentPropertyPath = `${propertyPath}.current`;
		await document.update({ [currentPropertyPath]: newProgress });
	}
}
