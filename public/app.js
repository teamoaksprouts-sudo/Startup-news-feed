const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// A stable anonymous ID per browser, so likes/comments persist for a visitor
// without requiring login.
function getVisitorId() {
  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('visitor_id', id);
  }
  return id;
}
const VISITOR_ID = getVisitorId();

const feedEl = document.getElementById('feed');
const storyTpl = document.getElementById('story-template');
const commentTpl = document.getElementById('comment-template');

async function loadFeed() {
  const { data: articles, error } = await sb
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(30);

  if (error) {
    feedEl.innerHTML = `<p class="loading">Couldn't load stories. Check your Supabase config in config.js.</p>`;
    console.error(error);
    return;
  }

  if (!articles.length) {
    feedEl.innerHTML = `<p class="loading">No stories yet — the fetcher runs hourly, check back soon.</p>`;
    return;
  }

  const [{ data: likes }, { data: comments }] = await Promise.all([
    sb.from('likes').select('article_id, visitor_id'),
    sb.from('comments').select('*').order('created_at', { ascending: true }),
  ]);

  feedEl.innerHTML = '';
  for (const article of articles) {
    const articleLikes = (likes || []).filter((l) => l.article_id === article.id);
    const articleComments = (comments || []).filter((c) => c.article_id === article.id);
    feedEl.appendChild(renderStory(article, articleLikes, articleComments));
  }
}

function renderStory(article, likes, comments) {
  const node = storyTpl.content.cloneNode(true);
  const storyEl = node.querySelector('.story');

  const img = node.querySelector('.story-img');
  img.src = article.image_url || '';
  img.alt = article.title;

  node.querySelector('.story-source').textContent = article.source;
  node.querySelector('.story-time').textContent = timeAgo(article.published_at);

  const titleLink = node.querySelector('.story-title a');
  titleLink.href = article.link;
  titleLink.textContent = article.title;

  node.querySelector('.story-summary').textContent = article.summary || '';

  // --- Likes ---
  const likeBtn = node.querySelector('.like-btn');
  const likeCount = node.querySelector('.like-count');
  let liked = likes.some((l) => l.visitor_id === VISITOR_ID);
  let count = likes.length;
  updateLikeUI();

  likeBtn.addEventListener('click', async () => {
    liked = !liked;
    count += liked ? 1 : -1;
    updateLikeUI();

    if (liked) {
      await sb.from('likes').insert({ article_id: article.id, visitor_id: VISITOR_ID });
    } else {
      await sb.from('likes').delete().match({ article_id: article.id, visitor_id: VISITOR_ID });
    }
  });

  function updateLikeUI() {
    likeBtn.classList.toggle('liked', liked);
    likeCount.textContent = count;
  }

  // --- Comments ---
  const commentToggle = node.querySelector('.comment-toggle');
  const commentCount = node.querySelector('.comment-count');
  const commentPanel = node.querySelector('.comment-panel');
  const commentList = node.querySelector('.comment-list');
  commentCount.textContent = comments.length;

  for (const c of comments) commentList.appendChild(renderComment(c));

  commentToggle.addEventListener('click', () => {
    commentPanel.hidden = !commentPanel.hidden;
  });

  const form = node.querySelector('.comment-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.querySelector('.comment-name').value.trim();
    const body = form.querySelector('.comment-body').value.trim();
    if (!name || !body) return;

    const { data, error } = await sb
      .from('comments')
      .insert({ article_id: article.id, visitor_id: VISITOR_ID, display_name: name, body })
      .select()
      .single();

    if (!error) {
      commentList.appendChild(renderComment(data));
      commentCount.textContent = Number(commentCount.textContent) + 1;
      form.reset();
    }
  });

  // --- Share ---
  node.querySelectorAll('.share-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleShare(btn.dataset.platform, article));
  });

  return node;
}

function renderComment(c) {
  const node = commentTpl.content.cloneNode(true);
  node.querySelector('.comment-author').textContent = c.display_name;
  node.querySelector('.comment-text').textContent = c.body;
  return node;
}

function handleShare(platform, article) {
  const url = encodeURIComponent(article.link);
  const text = encodeURIComponent(article.title);

  const urls = {
    whatsapp: `https://wa.me/?text=${text}%20${url}`,
    x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  };

  if (platform === 'copy') {
    navigator.clipboard.writeText(article.link);
    return;
  }
  window.open(urls[platform], '_blank', 'noopener,width=600,height=500');
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

loadFeed();
