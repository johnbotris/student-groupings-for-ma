import * as XLSX from "xlsx"

export function generateOutputWorkbook(rows: string[][]): ArrayBuffer {
    const workbook = XLSX.utils.book_new()

    const safeRows = rows.length > 0 ? rows : [[]]

    const worksheet = XLSX.utils.aoa_to_sheet(safeRows)

    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")

    return XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
    })
}
