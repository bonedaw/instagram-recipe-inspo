function normalizeSpace(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function extractHashtags(caption) {
  const matches = String(caption || '').match(/#[\p{L}\p{N}_-]+/gu) || [];
  return [...new Set(matches.map((h) => h.slice(1).toLowerCase()))];
}

function extractTitle(caption, fallback = 'Untitled recipe') {
  const lines = String(caption || '')
    .split(/\r?\n/)
    .map((l) => normalizeSpace(l))
    .filter(Boolean);
  if (!lines.length) return fallback;
  const first = lines[0]
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .replace(/[|•-]+$/g, '')
    .trim();
  return first || fallback;
}

function extractSections(caption) {
  const lines = String(caption || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const ingredients = [];
  const steps = [];
  let inIngredients = false;
  let inSteps = false;

  for (const line of lines) {
    const low = line.toLowerCase();
    if (/\bingredienser\b/.test(low) || /\bingredients\b/.test(low)) {
      inIngredients = true;
      inSteps = false;
      continue;
    }
    if (/\bgor sa har\b/.test(low) || /\bmethod\b/.test(low) || /\bsteg\b/.test(low)) {
      inIngredients = false;
      inSteps = true;
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      if (inIngredients) ingredients.push(line.replace(/^[-*•]\s+/, '').trim());
      else if (inSteps) steps.push(line.replace(/^[-*•]\s+/, '').trim());
      continue;
    }

    if (/^\d+[\).:-]\s+/.test(line)) {
      steps.push(line.replace(/^\d+[\).:-]\s+/, '').trim());
      continue;
    }
  }

  return { ingredients, steps };
}

function mediaToRecipe(media) {
  const caption = String(media.caption || '');
  const title = extractTitle(caption, `Recipe ${media.id}`);
  const tags = extractHashtags(caption);
  const { ingredients, steps } = extractSections(caption);

  return {
    id: media.id,
    title,
    caption,
    tags,
    ingredients,
    steps,
    permalink: media.permalink || null,
    mediaType: media.media_type || null,
    mediaUrl: media.media_url || media.thumbnail_url || null,
    timestamp: media.timestamp || null,
  };
}

function mediaListToRecipes(mediaList) {
  return mediaList
    .map(mediaToRecipe)
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
}

module.exports = { mediaListToRecipes };
