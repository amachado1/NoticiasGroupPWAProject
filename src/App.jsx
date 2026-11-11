import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import './App.css';
import { fetchCategories, fetchCategoryBySlug, fetchPostById, fetchPosts } from './wordpress.js';
import { loadMailerLiteForm } from './mailerLite.js';

const CURRENT_YEAR = new Date().getFullYear();
const EDITION_DATE = new Date();
const MAILERLITE_ACCOUNT_ID = import.meta.env.VITE_MAILERLITE_ACCOUNT_ID || '2572385';
const MAILERLITE_FORM_ID = import.meta.env.VITE_MAILERLITE_FORM_ID || '';
const CATEGORY_NAV_ORDER = [
  'mundo',
  'nacionales',
  'locales',
  'latinoamerica',
  'mexico',
  'espectaculos',
  'deportes',
  'salud',
  'ciencia',
  'tecnologia',
  'economia',
  'columnas',
];
const sortCategories = (categories) => {
  const order = new Map(CATEGORY_NAV_ORDER.map((slug, index) => [slug, index]));
  return categories
    .filter((category) => category.count > 0)
    .sort((first, second) => (
      (order.get(first.slug) ?? CATEGORY_NAV_ORDER.length)
      - (order.get(second.slug) ?? CATEGORY_NAV_ORDER.length)
      || first.name.localeCompare(second.name, 'es')
    ));
};

const formatDate = (value) => {
  if (!value) return 'Fecha no disponible';
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};


function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <AppHeader />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/categoria/:slug" element={<CategoryPage />} />
            <Route path="/articulo/:id" element={<ArticlePage />} />
            <Route path="/suscribete" element={<NewsletterPage />} />
            <Route path="/preferencias" element={<PreferencesPage />} />
            <Route path="/buscar" element={<SearchPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <AppFooter />
      </div>
    </BrowserRouter>
  );
}

function AppHeader() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories({ signal: controller.signal })
      .then((items) => setCategories(sortCategories(items)))
      .catch((error) => {
        if (error.name !== 'AbortError') setCategoryError(error.message);
      });

    return () => {
      controller.abort();
    };
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;
    navigate(`/buscar?query=${encodeURIComponent(query)}`);
  };

  return (
    <header className="topbar">
      <div className="header-top">
        <div className="brand-wrap">
          <Link to="/" className="brand" aria-label="Inicio Noticias Group">
            <img className="brand-logo" src="/brand-logo.webp" alt="Noticias Group — Periodismo que piensa en ti" />
          </Link>
        </div>

        <div className="header-tools">
          <form className={`search-form${searchOpen ? ' search-open' : ''}`} onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="site-search">Buscar noticias</label>
            <input
              id="site-search"
              type="search"
              placeholder="Buscar"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="submit" aria-label="Buscar noticias">Buscar</button>
          </form>
          <button
            type="button"
            className="header-icon-button search-toggle"
            aria-label={searchOpen ? 'Cerrar búsqueda' : 'Abrir búsqueda'}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
          </button>
          <button
            type="button"
            className={`header-icon-button menu-toggle${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <nav className={`main-nav${menuOpen ? ' menu-open' : ''}`} aria-label="Categorías principales">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} onClick={() => setMenuOpen(false)}>
          Inicio
        </NavLink>
        {categories.map((category) => (
          <NavLink
            key={category.slug}
            to={`/categoria/${category.slug}`}
            className={location.pathname.includes(category.slug) ? 'nav-item active' : 'nav-item'}
            onClick={() => setMenuOpen(false)}
          >
            {category.name}
          </NavLink>
        ))}
        {categoryError && <span className="nav-error" role="status">{categoryError}</span>}
        <Link to="/suscribete" className="nav-subscribe" onClick={() => setMenuOpen(false)}>Suscríbete</Link>
        <Link to="/preferencias" className="nav-preferences" onClick={() => setMenuOpen(false)}>Mis preferencias</Link>
      </nav>
    </header>
  );
}

function HomePage() {
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [columnArticles, setColumnArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [columnsError, setColumnsError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.all([fetchCategories({ signal }), fetchPosts({ perPage: 8, signal })])
      .then(async ([categoryList, result]) => {
        setCategories(sortCategories(categoryList));
        setPosts(result.posts);
        const columnsCategory = categoryList.find((category) => category.slug === 'columnas');
        if (!columnsCategory) return;
        try {
          const columnsResult = await fetchPosts({ perPage: 3, categoryId: columnsCategory.id, signal });
          setColumnArticles(columnsResult.posts);
        } catch (columnLoadError) {
          if (columnLoadError.name !== 'AbortError') setColumnsError(columnLoadError.message);
        }
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError.message);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const featured = posts[0];
  const supporting = posts.slice(1, 5);
  const trending = posts.slice(4, 8);
  const popular = posts.slice(0, 5);

  return (
    <>
      <HeadlineTicker posts={posts} />

      <section className="content-wrap front-page-lead">
        {loading ? (
          <div className="loading-box">Cargando noticias...</div>
        ) : error ? (
          <div className="loading-box" role="alert">{error}</div>
        ) : posts.length === 0 ? (
          <div className="loading-box">No hay noticias publicadas disponibles en este momento.</div>
        ) : (
          <div className="featured-layout">
            {featured && <FeaturedStory story={featured} />}
            <div className="supporting-grid">
              {supporting.map((story) => (
                <NewsCard key={story.id} story={story} compact />
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="content-wrap split-columns">
        <section className="content-panel">
          <div className="section-header-row">
            <SectionHeading title="Columnas" />
            <Link to="/categoria/columnas" className="section-link">Más columnas</Link>
          </div>
          <div className="stack-list">
            {columnsError ? (
              <div className="loading-box" role="alert">{columnsError}</div>
            ) : columnArticles.length ? columnArticles.map((story) => (
              <NewsCard key={`${story.id}-column`} story={story} listView />
            )) : <p>No hay columnas publicadas en este momento.</p>}
          </div>
        </section>

        <aside className="content-panel sidebar-panel">
          <div className="section-header-row">
            <SectionHeading title="Tendencia ahora" />
          </div>
          <TrendingStories stories={trending} />
        </aside>
      </div>

      <section className="content-wrap">
        <div className="section-header-row">
          <SectionHeading title="Más noticias" />
          <Link to="/categoria/mundo" className="section-link">Ver más noticias</Link>
        </div>
        <div className="news-grid">
          {posts.slice(1).map((story) => (
            <NewsCard key={story.id} story={story} />
          ))}
        </div>
      </section>

      <section className="content-wrap plus-cta-wrap">
        <div className="popular-block">
          <div className="section-header-row">
            <SectionHeading title="Populares" />
          </div>
          <ul className="popular-list">
            {popular.map((story, index) => (
              <li key={`${story.id}-popular`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <Link to={`/articulo/${story.id}`}>{story.title}</Link>
                  <p>{story.categoryName}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <NewsletterSignup compact />
      </section>

      <section className="content-wrap">
        <div className="category-strip">
          {categories.slice(0, 10).map((category) => (
            <Link key={category.slug} to={`/categoria/${category.slug}`} className="category-pill">
              {category.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function CategoryPage() {
  const { slug } = useParams();
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [loadMoreError, setLoadMoreError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setCategory(null);
    setPosts([]);
    setPage(1);
    setTotalPages(1);
    setError('');
    setLoadMoreError('');

    const loadCategory = async () => {
      try {
        const categoryResult = await fetchCategoryBySlug(slug, { signal });
        if (!categoryResult) {
          setError('No encontramos esta categoría en Noticias Group.');
          return;
        }
        setCategory(categoryResult);
        const result = await fetchPosts({ perPage: 6, categoryId: categoryResult.id, signal });
        setPosts(result.posts);
        setTotalPages(result.totalPages);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    setLoading(true);
    loadCategory();
    return () => controller.abort();
  }, [slug]);

  const loadMore = async () => {
    if (!category || loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    setLoadMoreError('');
    try {
      const result = await fetchPosts({ perPage: 6, categoryId: category.id, page: nextPage });
      setPosts((current) => [...current, ...result.posts]);
      setPage(nextPage);
    } catch (loadError) {
      setLoadMoreError(loadError.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="content-wrap">
      <div className="category-hero">
        <p className="eyebrow">Sección</p>
        <h1>{category?.name || 'Noticias'}</h1>
        <p>
          Noticias de {(category?.name || 'esta sección').toLowerCase()} con información útil, actualidad y contexto para la comunidad hispana.
        </p>
      </div>

      {loading ? (
        <div className="loading-box">Cargando contenido de {category?.name || 'esta sección'}...</div>
      ) : error ? (
        <div className="loading-box" role="alert">{error}</div>
      ) : posts.length === 0 ? (
        <div className="loading-box">No hay noticias publicadas en esta categoría.</div>
      ) : (
        <>
          <div className="featured-layout category-layout">
            {posts[0] && <FeaturedStory story={posts[0]} />}
            <div className="supporting-grid">
              {posts.slice(1, 5).map((story) => (
                <NewsCard key={story.id} story={story} compact />
              ))}
            </div>
          </div>

          <div className="news-grid category-grid">
            {posts.slice(5).map((story) => (
              <NewsCard key={`${story.id}-extra`} story={story} />
            ))}
          </div>

          {loadMoreError && <div className="loading-box" role="alert">{loadMoreError}</div>}
          {page < totalPages && (
            <div className="load-more-row">
              <button type="button" className="primary-button" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ArticlePage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relatedError, setRelatedError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setArticle(null);
    setRelated([]);
    setError('');
    setRelatedError('');
    setLoading(true);

    const loadArticle = async () => {
      try {
        const story = await fetchPostById(id, { signal });
        setArticle(story);
        if (story.categories[0]) {
          try {
            const result = await fetchPosts({ perPage: 5, categoryId: story.categories[0], signal });
            setRelated(result.posts.filter((item) => item.id !== story.id).slice(0, 4));
          } catch (loadError) {
            if (loadError.name !== 'AbortError') setRelatedError(loadError.message);
          }
        }
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    loadArticle();
    return () => controller.abort();
  }, [id]);

  const shareArticle = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: article?.title || 'Noticias Group', text: article?.excerpt || 'Lee esta nota', url });
      return;
    }

    await navigator.clipboard.writeText(url);
    window.alert('Enlace copiado al portapapeles.');
  };

  if (loading) {
    return <div className="content-wrap loading-box">Cargando artículo...</div>;
  }

  if (error || !article) {
    return <div className="content-wrap loading-box" role="alert">{error || 'No encontramos este artículo.'}</div>;
  }

  return (
    <article className="content-wrap article-shell">
      <div className="article-meta-row">
        <span className="category-badge">{article.categoryName}</span>
        <time dateTime={article.date}>{formatDate(article.date)}</time>
      </div>

      <h1 className="article-title">{article.title}</h1>
      <div className="article-byline">
        <span>Por {article.author}</span>
        <span>•</span>
        <span>{article.excerpt}</span>
      </div>

      {article.image && (
        <div className="article-hero-image">
          <img src={article.image} alt={article.imageAlt || article.title} />
        </div>
      )}

      <div className="article-layout">
        <div className="article-body">
          {article.content ? (
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          ) : (
            <p>El texto completo de este artículo no está disponible.</p>
          )}
        </div>

        <aside className="article-side">
          <div className="article-actions">
            <button type="button" className="secondary-button" onClick={shareArticle}>
              Compartir
            </button>
            <Link to="/" className="primary-button">
              Volver al inicio
            </Link>
          </div>
          <NewsletterSignup compact />
        </aside>
      </div>

      <div className="related-section">
        <div className="section-header-row">
          <SectionHeading title="Artículos relacionados" />
        </div>
        <div className="news-grid">
          {related.map((story) => (
            <NewsCard key={story.id} story={story} />
          ))}
        </div>
        {relatedError && <div className="loading-box" role="alert">{relatedError}</div>}
      </div>
    </article>
  );
}

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('query') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    if (!query.trim()) {
      setResults([]);
      setError('');
      setLoading(false);
      return () => controller.abort();
    }

    setResults([]);
    setError('');
    setLoading(true);
    fetchPosts({ perPage: 8, searchTerm: query, signal: controller.signal })
      .then((result) => setResults(result.posts))
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query]);

  if (!query) {
    return <div className="content-wrap loading-box">Introduce un término para buscar noticias.</div>;
  }

  return (
    <section className="content-wrap">
      <div className="section-header-row">
        <SectionHeading title={`Resultados para “${query}”`} />
      </div>
      {loading ? (
        <div className="loading-box">Buscando noticias...</div>
      ) : error ? (
        <div className="loading-box" role="alert">{error}</div>
      ) : results.length ? (
        <div className="news-grid">
          {results.map((story) => <NewsCard key={story.id} story={story} />)}
        </div>
      ) : <div className="loading-box">No se encontraron resultados.</div>}
    </section>
  );
}

function NewsletterPage() {
  const [formState, setFormState] = useState(MAILERLITE_FORM_ID ? 'loading' : 'unconfigured');

  useEffect(() => {
    if (!MAILERLITE_FORM_ID) return undefined;
    if (!/^[\w-]+$/.test(MAILERLITE_FORM_ID)) {
      setFormState('error');
      return undefined;
    }

    let active = true;
    loadMailerLiteForm(MAILERLITE_ACCOUNT_ID)
      .then(() => {
        if (active) setFormState('ready');
      })
      .catch(() => {
        if (active) setFormState('error');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="content-wrap newsletter-page">
      <div className="newsletter-panel">
        <div className="newsletter-copy">
          <p className="eyebrow">Newsletter</p>
          <h1>Recibe las noticias de Noticias Group</h1>
          <p>
            Entérate antes que nadie de actualidad, análisis y recomendaciones de la comunidad hispana en Illinois, Latinoamérica y el mundo.
          </p>
          <ul>
            <li>Resumen de la semana y temas destacados</li>
            <li>Recomendaciones editoriales y oportunidades locales</li>
            <li>Actualización diaria cuando hay noticias clave</li>
          </ul>
        </div>

        <div className="newsletter-form">
          <h2>Suscríbete gratis</h2>
          <p className="form-note">
            Al configurarlo, el formulario oficial de MailerLite administrará la validación, los duplicados y la confirmación según los ajustes de la cuenta.
          </p>
          {MAILERLITE_FORM_ID ? (
            <>
              {formState === 'loading' && <p role="status">Conectando con MailerLite...</p>}
              {formState === 'error' && (
                <div className="status error-message" role="alert">
                  No se pudo cargar el formulario oficial de MailerLite. No se envió ningún dato; inténtalo más tarde.
                </div>
              )}
              <div className="ml-embedded" data-form={MAILERLITE_FORM_ID} />
            </>
          ) : (
            <div className="status error-message" role="alert">
              El formulario todavía no está conectado y no se recopilará ningún dato. Para habilitarlo, configura el identificador de un formulario incrustado activo de MailerLite en <code>VITE_MAILERLITE_FORM_ID</code>. El doble opt-in y los grupos deben estar definidos en el propio formulario de MailerLite.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PreferencesPage() {
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoryError, setCategoryError] = useState('');
  const [preferences, setPreferences] = useState(() => {
    const stored = localStorage.getItem('noticias-group-preferences');
    if (!stored) {
      return {
        categories: ['Mundo', 'Nacionales', 'Deportes'],
        newsletter: true,
        compactLayout: false,
      };
    }

    try {
      return { ...{
        categories: ['Mundo', 'Nacionales', 'Deportes'],
        newsletter: true,
        compactLayout: false,
      }, ...JSON.parse(stored) };
    } catch {
      return {
        categories: ['Mundo', 'Nacionales', 'Deportes'],
        newsletter: true,
        compactLayout: false,
      };
    }
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories({ signal: controller.signal })
      .then((categories) => setCategoryOptions(sortCategories(categories)))
      .catch((error) => {
        if (error.name !== 'AbortError') setCategoryError(error.message);
      });
    return () => controller.abort();
  }, []);

  const toggleCategory = (name) => {
    setPreferences((current) => {
      const next = current.categories.includes(name)
        ? current.categories.filter((item) => item !== name)
        : [...current.categories, name];
      return { ...current, categories: next };
    });
  };

  const savePreferences = () => {
    localStorage.setItem('noticias-group-preferences', JSON.stringify(preferences));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <section className="content-wrap preferences-page">
      <div className="section-header-row">
        <SectionHeading title="Preferencias" />
      </div>

      <div className="preferences-panel">
        <div className="preference-block">
          <h2>Temas de interés</h2>
          {categoryError && <p role="alert">{categoryError}</p>}
          <div className="preference-grid">
            {categoryOptions.map((category) => (
              <label key={category.slug} className="check-item">
                <input
                  type="checkbox"
                  checked={preferences.categories.includes(category.name)}
                  onChange={() => toggleCategory(category.name)}
                />
                {category.name}
              </label>
            ))}
          </div>
        </div>

        <div className="preference-block">
          <h2>Configuración</h2>
          <label className="check-item">
            <input
              type="checkbox"
              checked={preferences.newsletter}
              onChange={(event) => setPreferences((current) => ({ ...current, newsletter: event.target.checked }))}
            />
            Recibir boletín semanal
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={preferences.compactLayout}
              onChange={(event) => setPreferences((current) => ({ ...current, compactLayout: event.target.checked }))}
            />
            Vista compacta en la home
          </label>
        </div>

        <div className="preference-actions">
          <button type="button" className="primary-button" onClick={savePreferences}>
            Guardar preferencias
          </button>
          {saved && <span className="saved-note">Guardado en localStorage</span>}
        </div>
      </div>
    </section>
  );
}

function AppFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <h3>Noticias Group</h3>
          <p>Periodismo digital e independiente para la comunidad hispana.</p>
        </div>
        <div>
          <h4>Secciones</h4>
          <ul>
            <li><Link to="/categoria/mundo">Mundo</Link></li>
            <li><Link to="/categoria/nacionales">Nacionales</Link></li>
            <li><Link to="/categoria/deportes">Deportes</Link></li>
          </ul>
        </div>
        <div>
          <h4>Empresa</h4>
          <ul>
            <li><Link to="/suscribete">Suscríbete</Link></li>
            <li><Link to="/preferencias">Preferencias</Link></li>
            <li><a href="https://noticiasgroup.com/">Contacto</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <a href="https://noticiasgroup.com/privacy-policy/">Política de Privacidad</a>
        <a href="https://noticiasgroup.com/quienes-somos/">Quiénes Somos</a>
        <span>© {CURRENT_YEAR} Noticias Group</span>
      </div>
    </footer>
  );
}

function HeadlineTicker({ posts }) {
  const today = EDITION_DATE.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase();
  const lead = posts[0];

  return (
    <section className="front-page-intro" aria-label="Titular de portada">
      <p className="edition-date">{today} <span>·</span> PERIODISMO DIGITAL E INDEPENDIENTE</p>
      {lead && (
        <Link to={`/articulo/${lead.id}`} className="headline-strip">
          <span>EN PORTADA</span>
          <strong>{lead.title}</strong>
          <span className="headline-arrow" aria-hidden="true">↗</span>
        </Link>
      )}
    </section>
  );
}

function SectionHeading({ title }) {
  return <h2 className="section-title">{title}</h2>;
}

function FeaturedStory({ story }) {
  return (
    <article className="featured-story">
      {story.image && (
        <Link to={`/articulo/${story.id}`} className="feature-image-wrap">
          <img src={story.image} alt={story.imageAlt || story.title} />
        </Link>
      )}
      <div className="feature-copy">
        <span className="category-badge">{story.categoryName}</span>
        <Link to={`/articulo/${story.id}`} className="feature-title-link">
          <h3>{story.title}</h3>
        </Link>
        <p>{story.excerpt}</p>
        <div className="story-meta">
          <span>{story.author}</span>
          <time dateTime={story.date}>{formatDate(story.date)}</time>
        </div>
      </div>
    </article>
  );
}

function NewsCard({ story, compact = false, listView = false }) {
  const cardClass = listView ? 'news-card list-card' : compact ? 'news-card compact-card' : 'news-card';

  return (
    <article className={cardClass}>
      {story.image && (
        <Link to={`/articulo/${story.id}`} className="card-image-wrap">
          <img src={story.image} alt={story.imageAlt || story.title} />
        </Link>
      )}
      <div className="card-body">
        <span className="category-badge">{story.categoryName}</span>
        <Link to={`/articulo/${story.id}`} className="card-title-link">
          <h3>{story.title}</h3>
        </Link>
        {!listView && <p>{story.excerpt}</p>}
        <div className="story-meta">
          <time dateTime={story.date}>{formatDate(story.date)}</time>
        </div>
      </div>
    </article>
  );
}

function TrendingStories({ stories }) {
  return (
    <ul className="trending-list">
      {stories.map((story) => (
        <li key={story.id}>
          <Link to={`/articulo/${story.id}`}>{story.title}</Link>
          <span>{story.categoryName}</span>
        </li>
      ))}
    </ul>
  );
}

function NewsletterSignup({ compact = false }) {
  return (
    <aside className={compact ? 'newsletter-callout compact' : 'newsletter-callout'}>
      <p className="eyebrow">Boletín</p>
      <h3>Recibe las noticias de Noticias Group</h3>
      <p>Una selección clara de contenido para mantenerte informado sin ruido.</p>
      <Link to="/suscribete" className="primary-button full-width">
        Suscribirme
      </Link>
    </aside>
  );
}

export default App;
