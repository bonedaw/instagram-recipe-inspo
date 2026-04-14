function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function matchesTags(recipe, includeTags, excludeTags) {
  const tags = new Set((recipe.tags || []).map((t) => String(t).toLowerCase()));
  for (const t of excludeTags) {
    if (tags.has(t)) return false;
  }
  if (includeTags.length === 0) return true;
  return includeTags.some((t) => tags.has(t));
}

function scoreRecipe(recipe) {
  const now = Date.now();
  const ts = recipe.timestamp ? new Date(recipe.timestamp).getTime() : 0;
  const ageDays = ts > 0 ? (now - ts) / (1000 * 60 * 60 * 24) : 9999;
  const recencyScore = Math.max(0, 100 - Math.min(ageDays, 100));
  const qualityScore =
    (recipe.ingredients?.length || 0) * 4 +
    (recipe.steps?.length || 0) * 4 +
    Math.min((recipe.caption || '').length / 80, 15);
  const randomJitter = Math.random() * 8;
  return recencyScore + qualityScore + randomJitter;
}

function pickSuggestions(recipes, { count = 3, includeTags = [], excludeTags = [] } = {}) {
  const filtered = recipes.filter((r) => matchesTags(r, includeTags, excludeTags));
  const ranked = filtered
    .map((r) => ({ recipe: r, score: scoreRecipe(r) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, count * 3));

  const out = [];
  const pool = ranked.map((x) => x.recipe);
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

module.exports = { parseCsv, pickSuggestions };
