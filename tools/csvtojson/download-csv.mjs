import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Insert your Google Sheet ID here
const SPREADSHEET_ID = '1WFG1LQv7KvdPpzn21D2s6e-E54Jirl-WDb8TKoJkg6M';

// Insert your sheet names here
const sheetNames = ['FU', 'FUID', 'ITEM', 'ACTOR', 'TYPES'];

// Input directory where CSV files will be saved
const inputFolder = path.join(__dirname, 'import');

async function downloadSheets() {
	try {
		// Create the directory if it doesn't exist
		await fs.promises.mkdir(inputFolder, { recursive: true });

		for (const sheetName of sheetNames) {
			const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;

			try {
				const response = await axios.get(url, { responseType: 'arraybuffer' });
				const csvData = response.data;

				// Define output filename
				const filePath = path.join(inputFolder, `Project FU Localization - ${sheetName}.csv`);

				// Save the CSV data to a file in the ./import folder
				await fs.promises.writeFile(filePath, csvData);
				console.log(`Downloaded: ${filePath}`);
			} catch (error) {
				console.error(`Failed to download sheet "${sheetName}":`, error.message);
			}
		}
	} catch (err) {
		console.error('Error ensuring input directory:', err.message);
	}
}

downloadSheets().catch(console.error);
