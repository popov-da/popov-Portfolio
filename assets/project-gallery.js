/**
 * Project page: fetch art.html, build a tile grid (images + embedded videos), lightbox for images.
 */
(function () {
    'use strict';

    var SITE_JSON = '../../assets/i18n/site.json';

    var defaultLabelsEn = {
        gallery_empty_link: 'Open project page',
        gallery_error_prefix: 'Could not load the gallery. ',
        gallery_error_link: 'Open art.html',
        lightbox_close: 'Close',
        gallery_video_title: 'Video',
        gallery_open_image: 'Open image'
    };

    var defaultLabelsRu = {
        gallery_empty_link: 'Открыть страницу работы',
        gallery_error_prefix: 'Не удалось загрузить галерею. ',
        gallery_error_link: 'Открыть art.html',
        lightbox_close: 'Закрыть',
        gallery_video_title: 'Видео',
        gallery_open_image: 'Открыть изображение'
    };

    function storedLang() {
        try {
            var s = localStorage.getItem('portfolio-lang');
            if (s === 'ru' || s === 'en') return s;
        } catch (e) { /* ignore */ }
        return document.documentElement.lang === 'en' ? 'en' : 'ru';
    }

    function fetchJson(url) {
        return fetch(url, { credentials: 'same-origin' }).then(function (r) {
            if (!r.ok) throw new Error('fetch');
            return r.json();
        });
    }

    function labelsForLang(site, lang) {
        var t = (site && site[lang]) || (site && site.en) || (site && site.ru) || {};
        return {
            gallery_empty_link: t.gallery_empty_link || defaultLabels.gallery_empty_link,
            gallery_error_prefix: t.gallery_error_prefix || defaultLabels.gallery_error_prefix,
            gallery_error_link: t.gallery_error_link || defaultLabels.gallery_error_link,
            lightbox_close: t.lightbox_close || defaultLabels.lightbox_close,
            gallery_video_title: t.gallery_video_title || defaultLabels.gallery_video_title,
            gallery_open_image: t.gallery_open_image || defaultLabels.gallery_open_image
        };
    }

    function parseArtHtml(htmlText) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(htmlText, 'text/html');
        var page = doc.querySelector('.project-page');
        if (!page) return [];
        var items = [];

        Array.prototype.forEach.call(page.children, function (sec) {
            if (!sec.classList || !sec.classList.contains('project-section')) return;
            var cap = sec.querySelector('.project-asset-caption .asset-caption p');
            var caption = cap ? cap.textContent.trim() : '';

            var iframe = sec.querySelector('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="player.vimeo"]');
            if (iframe) {
                var src = iframe.getAttribute('src') || '';
                if (src) {
                    items.push({ type: 'video', src: src, caption: caption });
                }
                return;
            }

            var link = sec.querySelector('a.colorbox-gal[href^="art-cdn/"], a[href^="art-cdn/"][data-colorbox]');
            if (!link) return;

            var full = link.getAttribute('href');
            if (!full) return;

            var imgEl =
                link.querySelector('img[src^="art-cdn/"]') || link.querySelector('picture img') || link.querySelector('img');
            var thumb = imgEl ? imgEl.getAttribute('src') : full;
            var alt = (imgEl && imgEl.getAttribute('alt')) || caption || '';

            items.push({
                type: 'image',
                full: full,
                thumb: thumb || full,
                caption: caption,
                alt: alt
            });
        });

        return items;
    }

    function esc(s) {
        if (!s) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function setTileAspectFromThumb(fig, img) {
        function apply() {
            var w = img.naturalWidth;
            var h = img.naturalHeight;
            if (w > 0 && h > 0) {
                fig.style.setProperty('--tile-ar', w + ' / ' + h);
            }
        }
        if (img.complete && img.naturalWidth) {
            apply();
        } else {
            img.addEventListener('load', apply, { once: true });
            img.addEventListener('error', function () {
                fig.style.setProperty('--tile-ar', '4 / 3');
            }, { once: true });
        }
    }

    /**
     * Picture/responsive markup often uses a different thumb file than href; aspect-ratio must match the full image.
     */
    function setTileAspect(fig, fullRelUrl, thumbImg) {
        if (!fullRelUrl || fullRelUrl === thumbImg.getAttribute('src')) {
            setTileAspectFromThumb(fig, thumbImg);
            return;
        }

        function fallbackThumb() {
            setTileAspectFromThumb(fig, thumbImg);
        }

        var probe = new Image();
        function applyProbe() {
            var w = probe.naturalWidth;
            var h = probe.naturalHeight;
            if (w > 0 && h > 0) {
                fig.style.setProperty('--tile-ar', w + ' / ' + h);
            } else {
                fallbackThumb();
            }
        }
        probe.onload = applyProbe;
        probe.onerror = fallbackThumb;
        probe.src = fullRelUrl;
        if (probe.complete && probe.naturalWidth) {
            applyProbe();
        }
    }

    function buildGrid(items, L) {
        var grid = document.createElement('div');
        grid.className = 'project-tiles-grid';
        grid.setAttribute('role', 'list');

        items.forEach(function (item) {
            if (item.type === 'video') {
                var wrap = document.createElement('div');
                wrap.className = 'project-tile project-tile--video';
                wrap.setAttribute('role', 'listitem');
                var inner = document.createElement('div');
                inner.className = 'project-tile-video';
                var ifr = document.createElement('iframe');
                ifr.setAttribute('loading', 'lazy');
                ifr.setAttribute('src', item.src);
                ifr.setAttribute('title', item.caption || L.gallery_video_title);
                ifr.setAttribute('allowfullscreen', '');
                ifr.setAttribute(
                    'allow',
                    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                );
                inner.appendChild(ifr);
                wrap.appendChild(inner);
                if (item.caption) {
                    var fc = document.createElement('p');
                    fc.className = 'project-tile-caption';
                    fc.textContent = item.caption;
                    wrap.appendChild(fc);
                }
                grid.appendChild(wrap);
                return;
            }

            var fig = document.createElement('figure');
            fig.className = 'project-tile project-tile--image';
            fig.setAttribute('role', 'listitem');

            var a = document.createElement('button');
            a.type = 'button';
            a.className = 'project-tile-btn';
            var name = (item.alt || item.caption || '').trim();
            a.setAttribute(
                'aria-label',
                name ? name + ' — ' + L.gallery_open_image : L.gallery_open_image
            );
            a.setAttribute('data-full', item.full);
            a.setAttribute('data-alt', item.alt || '');

            var img = document.createElement('img');
            img.src = item.thumb;
            img.alt = item.alt || '';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.className = 'project-tile-img';
            a.appendChild(img);
            fig.appendChild(a);
            setTileAspect(fig, item.full, img);

            if (item.caption) {
                var cap = document.createElement('figcaption');
                cap.className = 'project-tile-caption';
                cap.textContent = item.caption;
                fig.appendChild(cap);
            }

            grid.appendChild(fig);
        });

        return grid;
    }

    function setupLightbox(root, L) {
        var dialog = document.createElement('dialog');
        dialog.className = 'project-lightbox';
        dialog.innerHTML =
            '<div class="project-lightbox-inner">' +
            '<button type="button" class="project-lightbox-close">&times;</button>' +
            '<img class="project-lightbox-img" src="" alt="">' +
            '</div>';

        document.body.appendChild(dialog);

        var img = dialog.querySelector('.project-lightbox-img');
        var btnClose = dialog.querySelector('.project-lightbox-close');
        btnClose.setAttribute('aria-label', L.lightbox_close);

        root.addEventListener('click', function (e) {
            var b = e.target.closest('.project-tile-btn');
            if (!b || !root.contains(b)) return;
            var full = b.getAttribute('data-full');
            var alt = b.getAttribute('data-alt') || '';
            if (!full) return;
            img.src = full;
            img.alt = alt;
            if (typeof dialog.showModal === 'function') {
                dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
                dialog.style.display = 'flex';
            }
        });

        function closeLb() {
            if (typeof dialog.close === 'function') {
                dialog.close();
            } else {
                dialog.removeAttribute('open');
                dialog.style.display = '';
            }
            img.removeAttribute('src');
        }

        btnClose.addEventListener('click', closeLb);
        dialog.addEventListener('click', function (e) {
            if (e.target === dialog) closeLb();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && dialog.hasAttribute('open')) closeLb();
        });
    }

    function runGallery(host, L) {
        var artUrl = host.getAttribute('data-art-html') || 'art.html';

        host.classList.add('project-tiles-host--loading');
        host.setAttribute('aria-busy', 'true');

        fetch(artUrl, { credentials: 'same-origin' })
            .then(function (r) {
                if (!r.ok) throw new Error('fetch');
                return r.text();
            })
            .then(function (text) {
                var items = parseArtHtml(text);
                host.textContent = '';
                host.classList.remove('project-tiles-host--loading');
                host.removeAttribute('aria-busy');

                if (!items.length) {
                    host.innerHTML =
                        '<p class="project-tiles-empty">' +
                        '<a href="' +
                        esc(artUrl) +
                        '">' +
                        esc(L.gallery_empty_link) +
                        '</a></p>';
                    return;
                }

                var grid = buildGrid(items, L);
                host.appendChild(grid);
                setupLightbox(host, L);
            })
            .catch(function () {
                host.classList.remove('project-tiles-host--loading');
                host.removeAttribute('aria-busy');
                host.innerHTML =
                    '<p class="project-tiles-empty project-tiles-empty--error">' +
                    esc(L.gallery_error_prefix) +
                    '<a href="' +
                    esc(artUrl) +
                    '">' +
                    esc(L.gallery_error_link) +
                    '</a></p>';
            });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var host = document.querySelector('.project-tiles-host');
        if (!host) return;

        var lang = document.documentElement.lang === 'en' ? 'en' : 'ru';

        fetchJson(SITE_JSON)
            .then(function (site) {
                runGallery(host, labelsForLang(site, lang));
            })
            .catch(function () {
                runGallery(host, storedLang() === 'ru' ? defaultLabelsRu : defaultLabelsEn);
            });
    });
})();
