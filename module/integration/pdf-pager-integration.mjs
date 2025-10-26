const pdfReferencePattern = /([A-Za-z]+)\s*(\d+)/;

function onRenderDocumentSheet(application, element) {
	element.querySelectorAll('[data-pdfLink]').forEach((element) => {
		element.addEventListener('click', () => handlePdfSourceClick(application.document));
	});
}

function handlePdfSourceClick(doc) {
	const pdfReference = doc?.system?.source;

	if (pdfReference) {
		const match = pdfReferencePattern.exec(pdfReference);

		if (match) {
			const pdfCode = match[1];
			const pageNumber = match[2];

			ui.pdfpager.openPDFByCode(pdfCode, { page: pageNumber });
		} else {
			console.error('Invalid input format. Please use proper syntax "PDFCode PageNumber"');
		}
	}
}

let initialized = false;

const initialize = function () {
	if (!initialized) {
		initialized = true;

		const pdfPagerModule = game.modules.get('pdf-pager');
		if (pdfPagerModule?.active) {
			Hooks.on('renderDocumentSheetV2', onRenderDocumentSheet);
		}
	}
};

export const PdfPagerIntegration = Object.freeze({
	initialize,
});
