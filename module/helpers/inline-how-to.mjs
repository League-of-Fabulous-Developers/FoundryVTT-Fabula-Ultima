function activateListeners(document, html) {
	html.find('a.inline[draggable]').on('click', function () {
		ui.notifications.info('FU.DragAndDropHowTo', { localize: true });
	});
}

export const InlineElementsHowTo = { activateListeners };
