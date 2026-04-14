function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeSearchBlob(recipe) {
  return normalizeText(
    [
      recipe.title,
      recipe.caption,
      Array.isArray(recipe.tags) ? recipe.tags.join(' ') : '',
      Array.isArray(recipe.ingredients) ? recipe.ingredients.join(' ') : '',
    ].join(' ')
  );
}

const PROTEIN_HINTS = {
  fish: ['fisk', 'lax', 'torsk', 'kolja', 'rodspatta', 'tonfisk', 'skaldjur', 'scampi', 'rakor'],
  meat: ['kott', 'kyckling', 'flask', 'nots', 'hogs', 'lamm', 'korv', 'bacon', 'kottfars'],
  vegetarian: ['vegetar', 'vegansk', 'vegan', 'lins', 'bona', 'tofu', 'halloumi', 'falafel'],
};

function inferProteinType(recipe) {
  const blob = makeSearchBlob(recipe);
  for (const term of PROTEIN_HINTS.fish) {
    if (blob.includes(term)) return 'fish';
  }
  for (const term of PROTEIN_HINTS.meat) {
    if (blob.includes(term)) return 'meat';
  }
  for (const term of PROTEIN_HINTS.vegetarian) {
    if (blob.includes(term)) return 'vegetarian';
  }
  return 'unknown';
}

function hasTerm(blob, term) {
  return blob.includes(normalizeText(term));
}

function matchesProtein(recipe, protein) {
  if (!protein || protein === 'all') return true;
  const inferred = inferProteinType(recipe);
  if (protein === 'vegetarian') return inferred === 'vegetarian' || inferred === 'unknown';
  return inferred === protein;
}

function excludedByIngredient(blob, excludeIngredients) {
  return excludeIngredients.some((x) => hasTerm(blob, x));
}

function ingredientHits(blob, ingredients) {
  return ingredients.filter((x) => hasTerm(blob, x)).length;
}

function scoreRecipe(recipe, ctx) {
  const blob = makeSearchBlob(recipe);
  const hits = ingredientHits(blob, ctx.ingredients);
  const hasQuery = ctx.query ? hasTerm(blob, ctx.query) : false;
  const proteinMatch = matchesProtein(recipe, ctx.protein) ? 1 : 0;

  const ts = recipe.timestamp ? new Date(recipe.timestamp).getTime() : 0;
  const ageDays = ts > 0 ? (Date.now() - ts) / 86400000 : 10000;
  const recency = Math.max(0, 40 - Math.min(40, ageDays));

  return hits * 20 + (hasQuery ? 12 : 0) + proteinMatch * 8 + recency;
}

function searchRecipes(recipes, options = {}) {
  const count = Math.max(1, Number(options.count || 3));
  const ingredients = Array.isArray(options.ingredients) ? options.ingredients : [];
  const excludeIngredients = Array.isArray(options.excludeIngredients) ? options.excludeIngredients : [];
  const protein = options.protein || 'all';
  const query = normalizeText(options.query || '');

  const ranked = recipes
    .map((recipe) => {
      const blob = makeSearchBlob(recipe);
      const hits = ingredientHits(blob, ingredients);
      const proteinType = inferProteinType(recipe);
      return { recipe, blob, hits, proteinType, score: scoreRecipe(recipe, { ingredients, protein, query }) };
    })
    .filter(({ blob, hits, recipe }) => {
      if (!matchesProtein(recipe, protein)) return false;
      if (excludedByIngredient(blob, excludeIngredients)) return false;
      if (ingredients.length > 0 && hits === 0) return false;
      if (query && !hasTerm(blob, query)) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ recipe, hits, proteinType }) => ({ ...recipe, match: { hits, proteinType } }));

  return ranked;
}

module.exports = { parseCsv, searchRecipes, inferProteinType };
