const TEMPLATES = {
  grid_2x2: { key: 'grid_2x2', label: 'Grille 2×2', type: 'grid', rows: 2, cols: 2 },
  grid_2x3: { key: 'grid_2x3', label: 'Grille 2×3', type: 'grid', rows: 2, cols: 3 },
  grid_3x4: { key: 'grid_3x4', label: 'Grille 3×4', type: 'grid', rows: 3, cols: 4 },
  list: { key: 'list', label: 'Liste', type: 'list', rows: 0, cols: 1 },
  carousel: { key: 'carousel', label: 'Carrousel', type: 'carousel', rows: 1, cols: 1 },
};

const CELL_TYPES = ['empty', 'item', 'category'];

const DEFAULT_SETTINGS = { showPrices: true, showImages: true };

// Public shape for GET /api/screens/templates
const TEMPLATES_INFO = Object.values(TEMPLATES).map((t) => ({
  key: t.key,
  label: t.label,
  type: t.type,
  rows: t.rows,
  cols: t.cols,
}));

function emptyCells(count) {
  return Array.from({ length: count }, () => ({ type: 'empty' }));
}

function defaultLayout(templateKey) {
  const t = TEMPLATES[templateKey] || TEMPLATES.grid_2x2;
  const cellCount = t.type === 'grid' ? t.rows * t.cols : 0;
  return {
    template: t.key,
    rows: t.rows,
    cols: t.cols,
    cells: emptyCells(cellCount),
    settings: { ...DEFAULT_SETTINGS },
  };
}

function normalizeLayout(raw) {
  let layout = raw;
  if (typeof raw === 'string') {
    try {
      layout = JSON.parse(raw);
    } catch (e) {
      layout = {};
    }
  }
  if (!layout || typeof layout !== 'object') layout = {};

  // Legacy values from Phase 5: "full" -> grid_2x2, "compact" -> list
  const legacyMap = { full: 'grid_2x2', compact: 'list' };
  let templateKey = layout.template;
  if (!TEMPLATES[templateKey]) templateKey = legacyMap[templateKey];
  if (!TEMPLATES[templateKey]) templateKey = 'grid_2x2';

  const t = TEMPLATES[templateKey];
  const cellCount = t.type === 'grid' ? t.rows * t.cols : 0;
  const cells = Array.isArray(layout.cells)
    ? layout.cells.slice(0, cellCount).map((cell) => sanitizeCell(cell))
    : emptyCells(cellCount);

  // pad with empty cells when the grid was resized up
  while (cells.length < cellCount) cells.push({ type: 'empty' });

  return {
    template: t.key,
    rows: t.rows,
    cols: t.cols,
    cells,
    settings: { ...DEFAULT_SETTINGS, ...(layout.settings || {}) },
  };
}

function sanitizeCell(cell) {
  if (!cell || typeof cell !== 'object') return { type: 'empty' };
  const type = CELL_TYPES.includes(cell.type) ? cell.type : 'empty';
  if (type === 'item') {
    const itemId = parseInt(cell.itemId, 10);
    return Number.isInteger(itemId) && itemId > 0 ? { type, itemId } : { type: 'empty' };
  }
  if (type === 'category') {
    const categoryId = parseInt(cell.categoryId, 10);
    return Number.isInteger(categoryId) && categoryId > 0
      ? { type, categoryId }
      : { type: 'empty' };
  }
  return { type: 'empty' };
}

function validateLayout(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Layout must be an object' };
  }
  const templateKey = input.template;
  const t = TEMPLATES[templateKey];
  if (!t) {
    return { error: `Unknown template "${templateKey}". Allowed: ${Object.keys(TEMPLATES).join(', ')}` };
  }

  if (t.type === 'grid') {
    const expected = t.rows * t.cols;
    if (input.cells !== undefined) {
      if (!Array.isArray(input.cells)) {
        return { error: 'cells must be an array' };
      }
      if (input.cells.length !== expected) {
        return { error: `cells length must be ${expected} for template ${templateKey}` };
      }
      for (const cell of input.cells) {
        const bad = validateCell(cell);
        if (bad) return { error: `Invalid cell: ${bad}` };
      }
    }
  }

  const normalized = normalizeLayout({
    template: templateKey,
    cells: input.cells,
    settings: input.settings,
  });
  return { value: normalized };
}

function validateCell(cell) {
  if (!cell || typeof cell !== 'object') return 'must be an object';
  if (!CELL_TYPES.includes(cell.type)) return `type must be one of ${CELL_TYPES.join(', ')}`;
  if (cell.type === 'item') {
    const id = parseInt(cell.itemId, 10);
    if (!Number.isInteger(id) || id <= 0) return 'item cells need a positive itemId';
  }
  if (cell.type === 'category') {
    const id = parseInt(cell.categoryId, 10);
    if (!Number.isInteger(id) || id <= 0) return 'category cells need a positive categoryId';
  }
  return null;
}

module.exports = {
  TEMPLATES,
  TEMPLATES_INFO,
  DEFAULT_SETTINGS,
  defaultLayout,
  normalizeLayout,
  validateLayout,
};
