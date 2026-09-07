const Parser = require('rss-parser');
const { createClient } = require('@supabase/supabase-js');

const parser = new Parser({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  },
});

// Add or remove feeds here any time.
const FEEDS = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'Entrepreneur', url: 'https://www.entrepreneur.com/latest.rss' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/' },
  { name: 'Inc.', url: 'https://www.inc.com/rss' },
];

exports.handler = async function () {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // server-only key, never expose to the browser
  );

  let totalInserted = 0;

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);

      const rows = parsed.items.slice(0, 15).map((item) => ({
        title: item.title,
        link: item.link,
        source: feed.name,
        summary: (item.contentSnippet || '').slice(0, 300),
        image_url: extractImage(item),
        published_at: item.isoDate || new Date().toISOString(),
      }));

      // upsert on the unique "link" column so re-runs don't create duplicates
      const { error, count } = await supabase
        .from('articles')
        .upsert(rows, { onConflict: 'link', ignoreDuplicates: true, count: 'exact' });

      if (error) {
        console.error(`Error inserting ${feed.name}:`, error.message);
      } else {
        totalInserted += count || 0;
      }
    } catch (err) {
      if (err.message.includes('429')) {
        console.warn(`${feed.name} rate-limited this run (429) — will retry next hour.`);
      } else {
        console.error(`Failed to fetch ${feed.name}:`, err.message);
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, totalInserted }),
  };
};

function extractImage(item) {
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  const match = (item['content:encoded'] || item.content || '').match(
    /<img[^>]+src="([^">]+)"/
  );
  return match ? match[1] : null;
}
