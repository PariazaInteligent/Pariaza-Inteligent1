// @ts-ignore (to allow import from esm.sh without full TS typings for xlsx if not available)
import * as XLSX from 'xlsx';
import { formatDate } from './helpers'; // Assuming helpers.ts has formatDate

/**
 * Exports data to an XLSX file.
 * @param data Array of objects to export.
 * @param filename The desired filename (e.g., "users.xlsx").
 * @param sheetName Optional name for the sheet (defaults to "Sheet1").
 * @param columnHeaders Optional mapping of data keys to human-readable column headers.
 *                      Example: { id: "ID Utilizator", name: "Nume Complet" }
 */
export const exportToXLSX = (
    data: any[], 
    filename: string, 
    sheetName: string = "Sheet1",
    columnHeaders?: Record<string, string>
) => {
  if (!data || data.length === 0) {
    console.warn("No data provided to exportToXLSX.");
    // Optionally, show a user notification here
    return;
  }

  // If columnHeaders are provided, transform the data to use these headers
  // and ensure the order of columns matches the headers.
  let processedData = data;
  if (columnHeaders) {
    processedData = data.map(row => {
      const newRow: Record<string, any> = {};
      for (const key in columnHeaders) {
        if (Object.prototype.hasOwnProperty.call(columnHeaders, key)) {
            // Format dates specifically if they look like ISO strings
            if (typeof row[key] === 'string' && row[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                 newRow[columnHeaders[key]] = formatDate(row[key], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            } else {
                 newRow[columnHeaders[key]] = row[key] === undefined || row[key] === null ? '' : row[key];
            }
        }
      }
      return newRow;
    });
  } else {
    // Basic date formatting for all string fields that look like dates
     processedData = data.map(row => {
        const newRow = {...row};
        for (const key in newRow) {
            if (typeof newRow[key] === 'string' && newRow[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                 newRow[key] = formatDate(newRow[key], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            }
        }
        return newRow;
     });
  }


  const worksheet = XLSX.utils.json_to_sheet(processedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-fit columns (experimental, might not be perfect for all data)
  const columnWidths = Object.keys(processedData[0] || {}).map(key => {
    const headerLength = (columnHeaders ? Object.values(columnHeaders).find(h => h === key) || key : key).length;
    const maxLength = Math.max(
      headerLength,
      ...processedData.map(row => {
          const value = columnHeaders ? row[key] : row[Object.keys(columnHeaders || {}).find(k => (columnHeaders || {})[k] === key) || key];
          return value ? String(value).length : 0;
        }
      )
    );
    return { wch: maxLength + 2 }; // Adding a little padding
  });
  worksheet['!cols'] = columnWidths;


  XLSX.writeFile(workbook, filename);
};
