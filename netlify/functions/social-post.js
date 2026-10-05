const { createClient } = require('@supabase/supabase-js');

const TIME_ZONE = process.env.SOCIAL_TIMEZONE || 'Asia/Kolkata';

exports.handler = async function () {
  const now = new Date();
  const local = getLocalParts(now, TIME_ZONE);
  const sheet = await loadSocialSheet();
  if (!sheet.settings.enabled) return json({ ok: true, skipped: true, reason: 'automation_disabled' });
  if (!isScheduledNow(local, sheet.settings)) return json({ ok: true, skipped: true, reason: 'outside_schedule', local });
  const runKey = local.year + '-' + local.month + '-' + local.day + '-' + local.hour;
  const supabase = getSupabase();
  const { data: existingRun } = await supabase.from('social_posts').select('id').like('error_message', 'RUN:' + runKey + '%').limit(1);
  if (existingRun && existingRun.length) return json({ ok: true, skipped: true, reason: 'already_ran', runKey });
  const article = await chooseArticle(supabase, sheet);
  if (!article) return json({ ok: true, skipped: true, reason: 'no_matching_article' });
  const platforms = [];
  if (sheet.settings.linkedin) platforms.push('linkedin');
  if (sheet.settings.instagram) platforms.push('instagram');
  const results = [];
  const { data: previousPosts } = await supabase.from('social_posts').select('platform').eq('article_id', article.id).eq('status', 'published');
  const alreadyPublished = new Set((previousPosts || []).map(p => p.platform));
  for (const platform of platforms) {
    if (alreadyPublished.has(platform)) { results.push({ ok: true, skipped: true, platform, reason: 'already_published' }); continue; }
    const result = await publish(platform, article, sheet.settings);
    results.push(result);
    await supabase.from('social_posts').insert({
      article_id: article.id, platform, status: result.ok ? 'published' : 'failed',
      post_id: result.postId || null, post_url: result.postUrl || null, caption: result.caption,
      error_message: (result.ok ? '' : (result.error || 'Unknown error') + ' | ') + 'RUN:' + runKey,
      is_manual: Boolean(article._manual), published_at: result.ok ? new Date().toISOString() : null
    });
  }
  return json({ ok: true, article: article.id, results });
};

async function chooseArticle(supabase, sheet) {
  const forced = sheet.queue.find(r => truthy(r.force_post) && !truthy(r.posted));
  const { data: articles, error } = await supabase.from('articles').select('*').order('published_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  const { data: history } = await supabase.from('social_posts').select('article_id, platform').eq('status', 'published');
  const enabledPlatforms = [];
  if (sheet.settings.linkedin) enabledPlatforms.push('linkedin');
  if (sheet.settings.instagram) enabledPlatforms.push('instagram');
  const publishedByArticle = new Map();
  for (const h of history || []) {
    if (!publishedByArticle.has(h.article_id)) publishedByArticle.set(h.article_id, new Set());
    publishedByArticle.get(h.article_id).add(h.platform);
  }
  if (forced) {
    const match = articles.find(a => a.link === forced.article_url || a.id === forced.article_id);
    if (match) { match._manual = true; return match; }
  }
  const keywords = sheet.settings.keywords;
  const candidates = articles.filter(a => {
    const posted = publishedByArticle.get(a.id) || new Set();
    if (enabledPlatforms.length && enabledPlatforms.every(p => posted.has(p))) return false;
    if (!keywords.length) return true;
    const haystack = (a.title + ' ' + (a.summary || '') + ' ' + a.source).toLowerCase();
    return keywords.some(k => haystack.includes(k.toLowerCase()));
  });
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function publish(platform, article, settings) {
  const caption = buildCaption(article, settings, platform);
  return platform === 'linkedin' ? publishLinkedIn(caption) : publishInstagram(article, caption);
}

async function publishLinkedIn(caption) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const author = process.env.LINKEDIN_AUTHOR_URN;
  if (!token || !author) return { ok: false, caption, error: 'Missing LinkedIn environment variables' };
  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0', 'Linkedin-Version': process.env.LINKEDIN_VERSION || '202610' },
    body: JSON.stringify({ author, commentary: caption, visibility: 'PUBLIC', distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false })
  });
  const body = await response.text();
  if (!response.ok) return { ok: false, caption, error: 'LinkedIn ' + response.status + ': ' + body.slice(0, 500) };
  return { ok: true, caption, postId: response.headers.get('x-restli-id') };
}

async function publishInstagram(article, caption) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  if (!token || !accountId) return { ok: false, caption, error: 'Missing Instagram environment variables' };
  if (!article.image_url) return { ok: false, caption, error: 'Article has no public image_url for Instagram' };
  const base = process.env.META_GRAPH_BASE_URL || 'https://graph.facebook.com';
  const version = process.env.META_GRAPH_VERSION || 'v24.0';
  const createUrl = base + '/' + version + '/' + accountId + '/media';
  const created = await fetch(createUrl, { method: 'POST', body: new URLSearchParams({ image_url: article.image_url, caption, access_token: token }) });
  const createdJson = await created.json();
  if (!created.ok || !createdJson.id) return { ok: false, caption, error: 'Instagram container ' + created.status + ': ' + JSON.stringify(createdJson).slice(0, 500) };
  await new Promise(resolve => setTimeout(resolve, 3000));
  const published = await fetch(base + '/' + version + '/' + accountId + '/media_publish', { method: 'POST', body: new URLSearchParams({ creation_id: createdJson.id, access_token: token }) });
  const publishedJson = await published.json();
  if (!published.ok || !publishedJson.id) return { ok: false, caption, error: 'Instagram publish ' + published.status + ': ' + JSON.stringify(publishedJson).slice(0, 500) };
  return { ok: true, caption, postId: publishedJson.id };
}

function buildCaption(article, settings, platform) {
  const hashtags = settings.hashtags.length ? '\n\n' + settings.hashtags.join(' ') : '';
  const linkLine = platform === 'linkedin' ? '\n\nRead the full story: ' + article.link : '\n\nRead the full story via the link in bio.';
  return article.title + '\n\n' + (article.summary || 'A new development from the startup and business ecosystem.') + linkLine + hashtags;
}

async function loadSocialSheet() {
  const url = process.env.SOCIAL_SHEET_WEBAPP_URL;
  const secret = process.env.SOCIAL_SHEET_SECRET;
  if (!url || !secret) throw new Error('Missing SOCIAL_SHEET_WEBAPP_URL or SOCIAL_SHEET_SECRET');
  const response = await fetch(url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(secret));
  if (!response.ok) throw new Error('Google Sheet endpoint returned ' + response.status);
  const data = await response.json();
  return { settings: normalizeSettings(data.settings || {}), queue: Array.isArray(data.queue) ? data.queue : [] };
}

function normalizeSettings(raw) {
  return {
    enabled: truthy(raw.enabled ?? raw.automation),
    linkedin: truthy(raw.linkedin), instagram: truthy(raw.instagram),
    postingDays: String(raw.posting_days || raw.days || 'Tuesday,Thursday').split(',').map(x => x.trim().toLowerCase()).filter(Boolean),
    postingTime: String(raw.posting_time || raw.time || '11:00'),
    keywords: String(raw.keywords || '').split(/[,\n]/).map(x => x.trim()).filter(Boolean),
    hashtags: String(raw.hashtags || '').split(/[ ,\n]+/).map(x => x.trim()).filter(Boolean).map(x => x.startsWith('#') ? x : '#' + x)
  };
}

function isScheduledNow(local, settings) {
  const day = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][local.weekday];
  if (!settings.postingDays.includes(day)) return false;
  const hour = Number(settings.postingTime.split(':')[0]);
  return local.hour === hour;
}

function getLocalParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(date);
  const get = type => parts.find(p => p.type === type)?.value;
  const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return { weekday: weekdayNames.indexOf(get('weekday')), year: Number(get('year')), month: Number(get('month')), day: Number(get('day')), hour: Number(get('hour')) % 24 };
}

function truthy(value) { return ['true','yes','y','1','on'].includes(String(value).trim().toLowerCase()); }
function getSupabase() { return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }
function json(body) { return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }; }