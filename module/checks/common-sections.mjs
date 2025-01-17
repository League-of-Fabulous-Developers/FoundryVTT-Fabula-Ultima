/**
 * @param {CheckRenderData} sections
 * @param {string} description
 * @param {string} summary
 * @param {number} [order]
 */
const description = (sections, description, summary, order) => {
	if (summary || description) {
		sections.push(async () => ({
			partial: 'systems/projectfu/templates/chat/partials/chat-item-description.hbs',
			data: {
				summary,
				description: await TextEditor.enrichHTML(description),
				order,
			},
		}));
	}
};

/**
 * @param {CheckRenderData} sections
 * @param {ProgressDataModel} clock
 * @param {number} [order]
 */
const clock = (sections, clock, order) => {
	sections.push(async () => ({
		partial: 'systems/projectfu/templates/chat/partials/chat-clock-details.hbs',
		data: {
			data: clock,
			arr: clock.generateProgressArray(),
		},
		order: order,
	}));
};

export const CommonSections = Object.freeze({
	description,
	clock,
});
