(function () {
  'use strict';

  var OMDB_API_KEY = 'e218e271';
  if (typeof window !== 'undefined' && window.NOVASTREAM_OMDB_KEY) {
    OMDB_API_KEY = window.NOVASTREAM_OMDB_KEY;
  }

  // ========= Utilities =========
  function debounce(fn, delay) {
    var timer; return function () {
      var context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(context, args); }, delay);
    };
  }

  function createEl(tag, className, attrs) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    }
    return el;
  }

  // ========= Search =========
  function initializeSearch() {
    var form = document.getElementById('search-form');
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    var grid = document.getElementById('grid-results');
    if (!form || !input || !results) return;

    var currentType = 'movie';

    function setActiveFilter(type) {
      currentType = type;
      var links = document.querySelectorAll('.nav-list a[data-filter]');
      links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-filter') === type); });
    }

    // Wire nav actions
    document.querySelectorAll('.nav-list a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var filter = a.getAttribute('data-filter');
        var action = a.getAttribute('data-action');
        if (filter && a.getAttribute('href') === '#') {
          e.preventDefault();
          setActiveFilter(filter);
          performSearch();
          input.focus();
          return;
        }
        if (action === 'top-imdb') {
          e.preventDefault();
          window.open('https://www.imdb.com/chart/top/', '_blank');
          return;
        }
      });
    });
    function clearFilterActive() {
      document.querySelectorAll('.nav-list a[data-filter]').forEach(function (a) {
        a.classList.remove('active');
      });
    }
    var urlParams = new URLSearchParams(window.location.search);
    var attrType = document.body.getAttribute('data-default-type');
    var initialType = urlParams.get('type') || attrType || '';
    if (initialType) {
      setActiveFilter(initialType);
    } else {
      clearFilterActive();
    }
    (function markActiveNavByPath() {
      var path = (window.location.pathname || '').split('/').pop() || 'index.html';
      var homeCandidates = ['index.html', ''];
      document.querySelectorAll('.nav-list a').forEach(function (a) {
        var href = a.getAttribute('href') || '';
        var target = href.split('?')[0];
        var isHome = homeCandidates.indexOf(path) !== -1 && (target === 'index.html' || target === './' || target === '');
        if (!a.hasAttribute('data-filter')) {
          a.classList.toggle('active', isHome);
        }
      });
    })();

    var listEl = null;
    var showDropdown = true;

    function renderEmpty(message) {
      results.innerHTML = '';
      var empty = createEl('div', 'search-empty', { role: 'status' });
      empty.textContent = message;
      results.appendChild(empty);
    }

    function renderResults(items) {
      results.innerHTML = '';
      if (grid) grid.innerHTML = '';
      if (showDropdown) {
        listEl = createEl('ul', 'search-results-list', { role: 'presentation' });
      }
      var detailFetches = [];
      items.forEach(function (m, index) {
        var li = createEl('li', 'search-item', { role: 'option', 'data-id': m.imdbID, 'aria-selected': index === 0 ? 'true' : 'false' });
        var poster = createEl('img', 'search-item-poster', { alt: '', src: (m.Poster && m.Poster !== 'N/A') ? m.Poster : '' });
        var textWrap = createEl('div');
        var title = createEl('div', 'search-item-title'); title.textContent = m.Title || 'Untitled';
        var meta = createEl('div', 'search-item-meta');
        var year = createEl('span'); year.textContent = m.Year ? String(m.Year) : '';
        var dot1 = createEl('span', 'dot'); dot1.textContent = '•';
        var runtime = createEl('span'); runtime.textContent = '...'; runtime.setAttribute('data-role', 'runtime');
        var dot2 = createEl('span', 'dot'); dot2.textContent = '•';
        var type = createEl('span'); type.textContent = (m.Type || 'movie').charAt(0).toUpperCase() + (m.Type || 'movie').slice(1);
        meta.appendChild(year); meta.appendChild(dot1); meta.appendChild(runtime); meta.appendChild(dot2); meta.appendChild(type);
        textWrap.appendChild(title); textWrap.appendChild(meta);
        li.appendChild(poster); li.appendChild(textWrap);
        li.addEventListener('click', function () {
          var url = 'https://www.imdb.com/title/' + m.imdbID + '/';
          window.open(url, '_blank');
        });
        if (showDropdown && listEl) listEl.appendChild(li);

        //etail fetch to get runtime
        var detailsUrl = 'https://www.omdbapi.com/?apikey=' + encodeURIComponent(OMDB_API_KEY) + '&i=' + encodeURIComponent(m.imdbID);
        detailFetches.push(
          fetch(detailsUrl)
            .then(function (r) { return r.json(); })
            .then(function (d) {
              var rt = d && d.Runtime && d.Runtime !== 'N/A' ? d.Runtime : '';
              var runtimeEl = li.querySelector('[data-role="runtime"]');
              if (runtimeEl) runtimeEl.textContent = rt || '—';
            })
            .catch(function () { var runtimeEl = li.querySelector('[data-role="runtime"]'); if (runtimeEl) runtimeEl.textContent = '—'; })
        );
      });
      if (showDropdown && listEl) results.appendChild(listEl);

      if (grid) {
        items.forEach(function (m) {
          var card = createEl('article', 'media-card');
          var img = createEl('img', 'media-thumb', { alt: '', src: (m.Poster && m.Poster !== 'N/A') ? m.Poster : '' });
          var body = createEl('div', 'media-body');
          var t = createEl('h3', 'media-title'); t.textContent = m.Title || 'Untitled';
          var meta = createEl('p', 'media-meta');
          var year = createEl('span'); year.textContent = m.Year ? String(m.Year) : '';
          var dot = createEl('span'); dot.textContent = '•'; dot.style.opacity = '0.6';
          var type = createEl('span'); type.textContent = (m.Type || 'movie').charAt(0).toUpperCase() + (m.Type || 'movie').slice(1);
          meta.appendChild(year); meta.appendChild(dot); meta.appendChild(type);
          body.appendChild(t); body.appendChild(meta);
          card.appendChild(img); card.appendChild(body);
          card.addEventListener('click', function () {
            var url = 'https://www.imdb.com/title/' + m.imdbID + '/';
            window.open(url, '_blank');
          });
          grid.appendChild(card);
        });
        var infoSection = document.querySelector('.info');
        if (infoSection) infoSection.style.display = 'none';
      }
    }

    var performSearch = debounce(function () {
      var q = (input.value || '').trim();
      if (!q) {
        results.innerHTML = '';
        if (grid) grid.innerHTML = '';
        var infoSectionShow = document.querySelector('.info');
        if (infoSectionShow) infoSectionShow.style.display = '';
        return;
      }
      if (q.length < 2) { renderEmpty('Type at least 2 characters'); return; }
      if (!OMDB_API_KEY) { renderEmpty('Search unavailable (missing API key)'); return; }

      var url = 'https://www.omdbapi.com/?apikey=' + encodeURIComponent(OMDB_API_KEY) + '&type=' + encodeURIComponent(currentType) + '&s=' + encodeURIComponent(q) + '&page=1';
      fetch(url)
        .then(function (res) {
          return res.json().then(function (data) {
            return { status: res.status, data: data };
          });
        })
        .then(function (payload) {
          var status = payload.status; var data = payload.data || {};
          if (status === 401 || (data && data.Error && /invalid api key/i.test(data.Error))) {
            renderEmpty('OMDb: Invalid or inactive API key. Set window.NOVASTREAM_OMDB_KEY and try again.');
            return;
          }
          if (status === 403) {
            renderEmpty('OMDb: Access denied or rate limit. Try again later.');
            return;
          }
          if (!data || data.Response === 'False') {
            renderEmpty(data && data.Error ? data.Error : 'No results found');
            return;
          }
          var items = Array.isArray(data.Search) ? data.Search.slice(0, 8) : [];
          if (!items.length) { renderEmpty('No results found'); return; }
          renderResults(items);
        })
        .catch(function () { renderEmpty('Network error'); });
    }, 250);

    input.addEventListener('input', function () {
      showDropdown = true;
      performSearch();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var q = (input.value || '').trim();
      if (!q) { input.focus(); return; }
      // Hide dropdown on submit and show only grid results
      showDropdown = false;
      results.innerHTML = '';
      performSearch();
    });

    // Click outside to close dropdown
    document.addEventListener('click', function (e) {
      if (!results.contains(e.target) && e.target !== input) {
        showDropdown = false;
        results.innerHTML = '';
      }
    });
  }

  // ========= Browse (Grid without search) =========
  function initializeBrowseCatalog(currentType) {
    var grid = document.getElementById('grid-results');
    var loadMoreBtn = document.getElementById('load-more');
    if (!grid) return;

    var seeds = ['the','a','love','man','night','day','dark','fast','war','girl','life','time'];
    var seen = Object.create(null);
    var state = { seedIndex: 0, page: 1, busy: false };

    function renderCards(items) {
      items.forEach(function (m) {
        if (!m || !m.imdbID || seen[m.imdbID]) return;
        seen[m.imdbID] = true;
        var card = document.createElement('article'); card.className = 'media-card';
        var img = document.createElement('img'); img.className = 'media-thumb'; img.alt = ''; img.src = (m.Poster && m.Poster !== 'N/A') ? m.Poster : '';
        var body = document.createElement('div'); body.className = 'media-body';
        var t = document.createElement('h3'); t.className = 'media-title'; t.textContent = m.Title || 'Untitled';
        var meta = document.createElement('p'); meta.className = 'media-meta';
        var year = document.createElement('span'); year.textContent = m.Year || '';
        var dot = document.createElement('span'); dot.textContent = '•'; dot.style.opacity = '0.6';
        var type = document.createElement('span'); type.textContent = (m.Type || '').toString().charAt(0).toUpperCase() + (m.Type || '').toString().slice(1);
        meta.appendChild(year); meta.appendChild(dot); meta.appendChild(type);
        body.appendChild(t); body.appendChild(meta);
        card.appendChild(img); card.appendChild(body);
        card.addEventListener('click', function () { window.open('https://www.imdb.com/title/' + m.imdbID + '/', '_blank'); });
        grid.appendChild(card);
      });
    }

    function nextQuery() {
      var seed = seeds[state.seedIndex % seeds.length];
      var page = state.page;
      state.page += 1;
      if (state.page > 10) { state.page = 1; state.seedIndex += 1; }
      return { seed: seed, page: page };
    }

    // initial batch
    for (var i = 0; i < 3; i++) loadMore();
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMore);
  }

  // Initialize features
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // If search form exists → search mode; else browse mode
      if (document.getElementById('search-form')) {
        initializeSearch();
      } else {
        var initialType = (new URLSearchParams(window.location.search)).get('type') || document.body.getAttribute('data-default-type') || 'movie';
        initializeBrowseCatalog(initialType);
      }
    });
  } else {
    if (document.getElementById('search-form')) {
      initializeSearch();
    } else {
      var initialType2 = (new URLSearchParams(window.location.search)).get('type') || document.body.getAttribute('data-default-type') || 'movie';
      initializeBrowseCatalog(initialType2);
    }
  }
})();


