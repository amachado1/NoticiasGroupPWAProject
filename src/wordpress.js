const API_BASE = 'https://noticiasgroup.com/wp-json/wp/v2';

const requestJson = async (url, { signal } = {}) => {
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('No fue posible conectar con Noticias Group. Comprueba tu conexión e inténtalo de nuevo.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('El sitio de Noticias Group devolvió una respuesta inesperada.');
  }

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || `Noticias Group respondió con el código ${response.status}.`);
  }

  return { body, response };
};

const textFromHtml = (html = '') => {
  const element = document.createElement('div');
  element.innerHTML = html;
  return (element.textContent || '').replace(/\s+/g, ' ').trim();
};

const mapPost = (post) => {
  const terms = post._embedded?.['wp:term']?.flat() || [];
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  const author = post._embedded?.author?.[0];

  return {
    id: post.id,
    title: textFromHtml(post.title?.rendered) || 'Sin título',
    excerpt: textFromHtml(post.excerpt?.rendered || ''),
    content: post.content?.rendered || '',
    date: post.date,
    author: author?.name || 'Noticias Group',
    image: media?.source_url || '',
    imageAlt: media?.alt_text || textFromHtml(post.title?.rendered) || '',
    slug: post.slug,
    link: post.link,
    categoryName: terms.find((term) => term.taxonomy === 'category')?.name || 'Noticias',
    categories: post.categories || [],
  };
};

export async function fetchCategories({ signal } = {}) {
  const params = new URLSearchParams({
    per_page: '100',
    orderby: 'name',
    order: 'asc',
  });
  const { body } = await requestJson(`${API_BASE}/categories?${params}`, { signal });
  return body.filter((category) => category.slug !== 'uncategorized');
}

export async function fetchCategoryBySlug(slug, { signal } = {}) {
  const params = new URLSearchParams({ slug });
  const { body } = await requestJson(`${API_BASE}/categories?${params}`, { signal });
  return body[0] || null;
}

export async function fetchPosts({
  perPage = 8,
  page = 1,
  categoryId,
  searchTerm = '',
  signal,
} = {}) {
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });
  if (categoryId) params.set('categories', String(categoryId));
  if (searchTerm) params.set('search', searchTerm);

  const { body, response } = await requestJson(`${API_BASE}/posts?${params}&_embed`, { signal });
  if (!Array.isArray(body)) {
    throw new Error('Noticias Group devolvió una lista de noticias no válida.');
  }
  return {
    posts: body.map(mapPost),
    totalPages: Number(response.headers.get('X-WP-TotalPages') || 1),
  };
}

export async function fetchPostById(id, { signal } = {}) {
  const { body } = await requestJson(`${API_BASE}/posts/${encodeURIComponent(id)}?_embed`, { signal });
  return mapPost(body);
}
