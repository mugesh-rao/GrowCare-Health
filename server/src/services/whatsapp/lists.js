function validateList(list) {
  if (list == null) return []

  const errors = []
  if (!list || typeof list !== 'object') {
    return ['List configuration is invalid.']
  }

  if (!String(list.buttonText || '').trim()) {
    errors.push('List is missing button text.')
  }

  if (!Array.isArray(list.sections) || list.sections.length === 0) {
    errors.push('List needs at least one section.')
    return errors
  }

  list.sections.forEach((section, sectionIndex) => {
    const sectionPrefix = `List section ${sectionIndex + 1}`
    if (!section || typeof section !== 'object') {
      errors.push(`${sectionPrefix} is invalid.`)
      return
    }

    if (!Array.isArray(section.rows) || section.rows.length === 0) {
      errors.push(`${sectionPrefix} needs at least one row.`)
      return
    }

    section.rows.forEach((row, rowIndex) => {
      const rowPrefix = `${sectionPrefix}, row ${rowIndex + 1}`
      if (!row || typeof row !== 'object') {
        errors.push(`${rowPrefix} is invalid.`)
        return
      }
      if (!String(row.title || '').trim()) {
        errors.push(`${rowPrefix} is missing a title.`)
      }
    })
  })

  return errors
}

function buildListMessage(text = '', footer = '', list = {}) {
  return {
    listMessage: {
      title: String(list.title || '').trim() || undefined,
      description: String(text || '').trim() || undefined,
      buttonText: String(list.buttonText || '').trim(),
      listType: 1,
      sections: (list.sections || []).map((section) => ({
        title: String(section.title || '').trim() || undefined,
        rows: (section.rows || []).map((row) => ({
          title: String(row.title || '').trim(),
          description: String(row.description || '').trim() || undefined,
          rowId: String(row.rowId || row.id || row.title || '').trim(),
        })),
      })),
      footerText: String(footer || '').trim() || undefined,
    },
  }
}

module.exports = { validateList, buildListMessage }
