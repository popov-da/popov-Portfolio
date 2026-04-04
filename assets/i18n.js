(function () {
    'use strict';

    var LANG_KEY = 'portfolio-lang';

    function getLang() {
        try {
            var s = localStorage.getItem(LANG_KEY);
            if (s === 'ru' || s === 'en') return s;
        } catch (e) { /* ignore */ }
        var nav = (navigator.language || '').toLowerCase();
        if (nav.indexOf('en') === 0) return 'en';
        return 'ru';
    }

    function setLang(lang) {
        try {
            localStorage.setItem(LANG_KEY, lang);
        } catch (e) { /* ignore */ }
    }

    function bindLangSwitcher(currentLang) {
        document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                setLang(btn.getAttribute('data-set-lang'));
                location.reload();
            });
            var l = btn.getAttribute('data-set-lang');
            if (l === currentLang) {
                btn.classList.add('is-active');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.setAttribute('aria-pressed', 'false');
            }
        });
    }

    function fetchJson(url) {
        return fetch(url, { credentials: 'same-origin' }).then(function (r) {
            if (!r.ok) throw new Error('fetch ' + url);
            return r.json();
        });
    }

    function initPortfolioCategoryTabs(t, projects) {
        var tablist = document.getElementById('portfolio-cat-tabs');
        if (!tablist || !projects) return;
        if (t && t.portfolio_cat_aria) tablist.setAttribute('aria-label', t.portfolio_cat_aria);

        document.querySelectorAll('a.card[data-project-slug]').forEach(function (card) {
            var slug = card.getAttribute('data-project-slug');
            var p = projects[slug];
            if (p && p.categories && p.categories.length) {
                card.setAttribute('data-categories', p.categories.join(' '));
            }
        });

        var grid = document.querySelector('.portfolio-grid');
        var buttons = tablist.querySelectorAll('[data-cat]');

        function apply(cat) {
            if (!grid) return;
            grid.querySelectorAll('a.card').forEach(function (card) {
                var cats = (card.getAttribute('data-categories') || '').split(/\s+/).filter(Boolean);
                var show = cat === 'all' || cats.length === 0 || cats.indexOf(cat) !== -1;
                card.style.display = show ? '' : 'none';
            });
            buttons.forEach(function (btn) {
                var active = btn.getAttribute('data-cat') === cat;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
            try {
                if (cat === 'all') {
                    history.replaceState(null, '', location.pathname + location.search + '#projects');
                } else if (cat === 'documentation') {
                    history.replaceState(null, '', location.pathname + location.search + '#cat-documentation');
                } else {
                    history.replaceState(null, '', location.pathname + location.search + '#cat-' + cat);
                }
            } catch (e) { /* ignore */ }
        }

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                apply(btn.getAttribute('data-cat'));
            });
        });

        window.addEventListener('hashchange', function () {
            var h = (location.hash || '').replace(/^#/, '');
            var next = 'all';
            if (h === 'cat-3d') next = '3d';
            else if (h === 'cat-documentation') next = 'documentation';
            else if (h === 'cat-it') next = 'it';
            apply(next);
        });

        var h = (location.hash || '').replace(/^#/, '');
        var initial = 'all';
        if (h === 'cat-3d') initial = '3d';
        else if (h === 'cat-documentation') initial = 'documentation';
        else if (h === 'cat-it') initial = 'it';
        apply(initial);
    }

    function initHome() {
        var lang = getLang();
        document.documentElement.lang = lang === 'en' ? 'en' : 'ru';
        bindLangSwitcher(lang);

        var base = 'assets/i18n/';
        Promise.all([fetchJson(base + 'site.json'), fetchJson(base + 'projects.json')])
            .then(function (results) {
                var site = results[0];
                var projects = results[1];
                var t = site[lang];
                if (!t) return;

                document.querySelectorAll('[data-i18n]').forEach(function (el) {
                    var key = el.getAttribute('data-i18n');
                    if (t[key]) el.textContent = t[key];
                });

                var group = document.querySelector('.lang-switch');
                if (group && t.lang_aria) group.setAttribute('aria-label', t.lang_aria);

                var nav = document.getElementById('site-nav');
                if (nav && t.nav_aria) nav.setAttribute('aria-label', t.nav_aria);

                document.querySelectorAll('a.card[data-project-slug]').forEach(function (card) {
                    var id = card.getAttribute('data-project-slug');
                    var p = projects[id];
                    if (!p || !p.title) return;
                    var title = p.title[lang] || p.title.en || p.title.ru;
                    var titleEl = card.querySelector('.card-title');
                    if (titleEl) titleEl.textContent = title;
                    var img = card.querySelector('img');
                    if (img) img.alt = title;
                });

                var meta = document.querySelector('meta[name="description"]');
                if (meta && t.meta_description) meta.setAttribute('content', t.meta_description);

                if (t.page_title) document.title = t.page_title;

                initPortfolioCategoryTabs(t, projects);
            })
            .catch(function () { /* keep static fallbacks */ });
    }

    function initProject(projectSlug) {
        var lang = getLang();
        document.documentElement.lang = lang === 'en' ? 'en' : 'ru';
        bindLangSwitcher(lang);

        var prefix = '../../assets/i18n/';
        Promise.all([fetchJson(prefix + 'site.json'), fetchJson(prefix + 'projects.json')])
            .then(function (results) {
                var site = results[0];
                var projects = results[1];
                var t = site[lang];
                var p = projects[projectSlug];
                if (!t || !p) return;

                document.querySelectorAll('[data-i18n]').forEach(function (el) {
                    var key = el.getAttribute('data-i18n');
                    if (t[key]) el.textContent = t[key];
                });

                var group = document.querySelector('.lang-switch');
                if (group && t.lang_aria) group.setAttribute('aria-label', t.lang_aria);

                var title = (p.title && (p.title[lang] || p.title.en || p.title.ru)) || '';
                var h1 = document.querySelector('h1');
                if (h1) h1.textContent = title;
                document.title = title + ' — Dmitrii Popov';

                var ifr = document.querySelector('.project-art-iframe--primary');
                if (ifr && t.project_art_iframe_title) {
                    ifr.setAttribute('title', t.project_art_iframe_title);
                }
            })
            .catch(function () { /* keep static shell */ });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var page = document.body.getAttribute('data-page');
        if (page === 'home') initHome();
        else if (page === 'project') {
            var slug = document.body.getAttribute('data-project-slug');
            if (slug) initProject(slug);
        }
    });
})();
