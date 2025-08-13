import { FU } from '../helpers/config.mjs';
import { getTargeted } from '../helpers/target-handler.mjs';
import { CommonEvents } from '../checks/common-events.mjs';

/**
 * @property {FUActor} actor The actor who started the study roll
 * @property {FUActor[]} targets The targets of the study roll.
 */
export class StudyRollHandler {
	static #coreStudyDifficulties = Object.freeze([10, 13, 16]);
	static #revisedStudyDifficulties = Object.freeze([7, 10, 13]);

	/**
	 * @type {Number}
	 * @private
	 */
	#studyValueOverride;

	constructor(actor, checkResult, targets) {
		this.actor = actor;
		this.checkResult = checkResult;
		this.targets = targets || [];
	}

	get studyValue() {
		// If there's an override
		if (this.#studyValueOverride) {
			return this.#studyValueOverride;
		}
		if (this.checkResult) {
			return this.checkResult.result;
		}
		return 0;
	}

	/**
	 * Handle the study roll interaction with targeted actors
	 */
	async handleStudyTarget() {
		/** @type {FUActor[]} **/
		let targets = this.targets;
		if (targets.length < 1) {
			console.debug('No targets to study have been given');
			return;
		}

		// Now execute directly on GM or request as user
		if (game.user?.isGM) {
			CommonEvents.study(this.actor, targets, this.studyValue);
		} else {
			await game.projectfu.socket.studyRoll({
				actorUuid: this.actor.uuid,
				targetUuids: targets.map((t) => t.uuid),
				checkResult: this.checkResult,
			});
			return false;
		}
	}

	/**
	 * @param {{actorUuid : String, targetUuids: String[], checkResult: Number}} data
	 * @returns {Promise<void>}
	 */
	static async onStudyEvent(data) {
		const actor = await fromUuid(data.actorUuid);
		const targets = await Promise.all(
			data.targetUuids.map(async (target) => {
				return fromUuid(target);
			}),
		);
		CommonEvents.study(actor, targets, data.checkResult.result);
	}

	/**
	 * Handle the study roll interaction
	 */
	async handleStudyRoll() {
		const useRevisedStudyRule = game.settings.get('projectfu', 'useRevisedStudyRule');
		const difficultyThresholds = useRevisedStudyRule ? FU.studyRoll.revised : FU.studyRoll.core;
		const localizedStrings = this._getLocalizedStrings();

		this.targets = this.actor.type === 'character' ? getTargeted() : [this.actor];
		const tokenInfo = this._generateTokenInfo(this.targets);

		const contentRows = this._generateContentRows(difficultyThresholds, localizedStrings);

		// Create the dialog
		await foundry.applications.api.DialogV2.confirm({
			window: { title: localizedStrings.studyRoll },
			classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
			content: this._buildDialogContent(tokenInfo, contentRows, localizedStrings),
			render: async (event, dialog) => {
				// Attach retarget button listener after dialog is rendered
				dialog.element.querySelector('#retarget').addEventListener('click', async () => {
					console.log('Retarget button clicked'); // Debugging log
					const newTargets = await getTargeted();
					console.log('New Targets:', newTargets); // Debugging log

					// Update the instance's targets
					this.targets = newTargets;

					// Generate new token information and update the dialog content
					const newTokenInfo = this._generateTokenInfo(newTargets);
					const newContentRows = this._generateContentRows(difficultyThresholds, localizedStrings);

					// Re-render the dialog content
					dialog.element.querySelector('.targets-container').innerHTML = newTokenInfo;
					dialog.element.querySelector('.content-rows').innerHTML = newContentRows.join('\n');
				});
			},
			yes: {
				label: localizedStrings.submit,
				callback: async (event, button, dialog) => this._handleDialogSubmit(dialog),
			},
			no: { label: localizedStrings.cancel },
		});
	}

	/**
	 * Get localized strings for the dialog
	 */
	_getLocalizedStrings() {
		return {
			submit: game.i18n.localize('FU.Submit'),
			studyRoll: game.i18n.localize('FU.StudyRoll'),
			dataTitleResult: game.i18n.localize('FU.StudyTitleResult'),
			dataTitle: game.i18n.localize('FU.StudyTitle'),
			data1: game.i18n.localize('FU.StudyResultOne'),
			data2: game.i18n.localize('FU.StudyResultTwo'),
			data3: game.i18n.localize('FU.StudyResultThree'),
			dataResult: game.i18n.localize('FU.StudyTotalField'),
			retarget: game.i18n.localize('FU.ChatContextRetarget'),
			cancel: game.i18n.localize('FU.Cancel'),
		};
	}

	/**
	 * Generate token information HTML
	 */
	_generateTokenInfo(tokens) {
		return tokens
			.map(
				({ img, name }) => `
        <div class="flexcol resource-content">
            <img src="${img}" style="width: 36px; height: 36px; vertical-align: middle; margin-right: 5px;">
            <strong>${name}</strong>
        </div><br>`,
			)
			.join('');
	}

	/**
	 * Generate the table rows for difficulty thresholds
	 */
	_generateContentRows(thresholds, localizedStrings) {
		return [`<tr><td>${thresholds[0]}+</td><td>${localizedStrings.data1}</td></tr>`, `<tr><td>${thresholds[1]}+</td><td>${localizedStrings.data2}</td></tr>`, `<tr><td>${thresholds[2]}+</td><td>${localizedStrings.data3}</td></tr>`];
	}

	/**
	 * Build the HTML content for the dialog
	 */
	_buildDialogContent(tokenInfo, contentRows, localizedStrings) {
		return `
        <div class="desc mb-3 gap-5">
            <div class="flexrow form-group targets-container">${tokenInfo}</div>
            <button type="button" id="retarget" class="btn">${localizedStrings.retarget}</button>
        </div>
        <div class="desc mb-5">
            <table>
                <tr><th>${localizedStrings.dataTitleResult}</th><th>${localizedStrings.dataTitle}</th></tr>
                ${contentRows.join('')}
            </table>
        </div>
        <div class="resource-content desc">
            <p>${localizedStrings.dataResult}</p>
            <input type="number" id="study-input" value="${this.studyValue || ''}">
        </div>
        <hr>`;
	}

	/**
	 * Handle dialog submit
	 */
	async _handleDialogSubmit(dialog) {
		const studyValue = parseInt(dialog.element.querySelector('#study-input').value, 10);
		if (!isNaN(studyValue)) {
			this.#studyValueOverride = studyValue;
			await this.handleStudyTarget();
		} else {
			ui.notifications.error('Invalid study value entered.');
		}
	}

	static getMaxValue() {
		return this.getStudyDifficulties().at(-1);
	}

	/**
	 * @return {[number, number, number]}
	 */
	static getStudyDifficulties() {
		const useRevisedStudyRule = game.settings.get('projectfu', 'useRevisedStudyRule');
		return useRevisedStudyRule ? this.#revisedStudyDifficulties : this.#coreStudyDifficulties;
	}

	/**
	 * @param {Number} studyValue
	 * @returns {"none"|"basic"|"complete"|"detailed"}
	 */
	static resolveStudyResult(studyValue) {
		const difficultyThresholds = this.getStudyDifficulties();

		let result;
		if (studyValue >= difficultyThresholds[0] && studyValue < difficultyThresholds[1]) result = 'basic';
		else if (studyValue >= difficultyThresholds[1] && studyValue < difficultyThresholds[2]) result = 'complete';
		else if (studyValue >= difficultyThresholds[2]) result = 'detailed';
		else result = 'none';
		return result;
	}
}
