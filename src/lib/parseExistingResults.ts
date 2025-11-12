import * as XLSX from "xlsx"

export function parseExistingResults(data: ArrayBuffer): string[][] {
    const workbook = XLSX.read(data)
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) return []

    const sheet = workbook.Sheets[firstSheetName]

    // Convert sheet to raw arrays
    const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    // Trim trailing empty cells in a row
    const trimTrailingEmpty = (row: unknown[]): string[] => {
        let end = row.length
        while (
            end > 0 &&
            (row[end - 1] === null ||
                row[end - 1] === undefined ||
                row[end - 1] === "")
        ) {
            end--
        }
        return row.slice(0, end).map(cell => {
            if (cell === null || cell === undefined) return ""
            if (cell instanceof Date) return cell.toISOString()
            return String(cell)
        })
    }

    return raw.map(trimTrailingEmpty).filter(row => row.length > 0)
}
