/**
 * Edit a Document image in an ApplicationV2 context.
 * @param {DocumentSheetV2} app
 * @param {HTMLElement} target
 */
export async function editImageFile(app, target) {
	if (target.nodeName !== 'IMG') {
		throw new Error('The editImage action is available only for IMG elements.');
	}
	const attr = target.dataset.edit;
	const current = foundry.utils.getProperty(app.document._source, attr);
	const defaultArtwork = app.document.constructor.getDefaultArtwork?.(app.document._source) ?? {};
	const defaultImage = foundry.utils.getProperty(defaultArtwork, attr);
	const fp = new foundry.applications.apps.FilePicker({
		current,
		type: 'image',
		redirectToRoot: defaultImage ? [defaultImage] : [],
		callback: (path) => {
			target.src = path;
			if (app.options.form.submitOnChange) {
				const submit = new Event('submit', { cancelable: true });
				app.element.dispatchEvent(submit);
			}
		},
		top: app.position.top + 40,
		left: app.position.left + 10,
	});
	await fp.browse();
}
