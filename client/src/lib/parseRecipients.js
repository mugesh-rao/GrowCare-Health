const PHONE_KEYS = [
  'phone',
  'number',
  'mobile',
  'whatsapp',
  'contact',
  'msisdn',
  'cell',
]

/**
 * Parse an uploaded .xlsx / .xls / .csv file into recipients.
 * Detects the phone column; every column is kept as a template variable.
 * @returns {{ recipients: Array<{phone, vars}>, columns: string[], phoneKey: string }}
 */
export async function parseRecipientsFile(file) {
  const XLSX = await import('xlsx') // lazy-loaded — keeps it out of the main bundle
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  if (!rows.length) return { recipients: [], columns: [], phoneKey: null }

  const columns = Object.keys(rows[0])
  const phoneKey =
    columns.find((c) => PHONE_KEYS.some((k) => c.toLowerCase().includes(k))) ||
    columns[0]

  const recipients = rows
    .map((r) => ({
      phone: String(r[phoneKey] ?? '').replace(/\D/g, ''),
      vars: r,
    }))
    .filter((r) => r.phone.length >= 6)

  return { recipients, columns, phoneKey }
}

/** Replace {{column}} placeholders (case-insensitive) with row values. */
export function applyTemplate(text, vars = {}) {
  return text.replace(/{{\s*([\w ]+?)\s*}}/g, (_, key) => {
    const hit = Object.keys(vars).find(
      (k) => k.toLowerCase() === key.trim().toLowerCase(),
    )
    return hit ? String(vars[hit]) : ''
  })
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Generate and download a sample recipients spreadsheet. */
export async function downloadSampleFile() {
  const XLSX = await import('xlsx')
  const rows = [
    { phone: '919876543210', name: 'Asha', company: 'Acme' },
    { phone: '14155550101', name: 'Maria', company: 'Globex' },
  ]
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Recipients')
  XLSX.writeFile(wb, 'growto-sample-recipients.xlsx')
}
