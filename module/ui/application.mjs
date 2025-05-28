const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

/**
 * @description A stock application meant for async behavior using templates.
 * @property {HTMLElement} element
 */
export default class FUApplication extends HandlebarsApplicationMixin(Application) {
	/** @inheritdoc */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'sheet', 'backgroundstyle'],
		form: {
			submitOnChange: true,
			closeOnSubmit: true,
		},
		position: {
			width: 450,
			height: 'auto',
		},
		tag: 'form',
		window: {
			contentClasses: ['standard-form'],
		},
	};
}
