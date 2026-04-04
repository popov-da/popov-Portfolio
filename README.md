# Портфолио — Dmitrii Popov

Статический сайт-портфолио (HTML, CSS, JavaScript). Публикуется через **GitHub Pages**, домен: [popov-da.ru](https://popov-da.ru) (файл `CNAME`).

## Структура

| Путь | Назначение |
|------|------------|
| `index.html` | Главная: сетка проектов, фильтр по категориям, RU/EN |
| `assets/` | Стили, i18n (`assets/i18n.js`, `site.json`, `projects.json`), превью карточек `assets/portfolio/`, общий `art-embed-shell.js` |
| `assets/artstation-static/` | Локальные бандлы вёрстки ArtStation (CSS/JS) для встраиваемых страниц |
| `projects/<slug>/` | Страница проекта: `index.html` + `art.html` (контент экспорта) + `art-cdn/` (картинки) |

Язык интерфейса переключается кнопками RU/EN, выбор хранится в `localStorage`.

## Локальный просмотр

Требуется [Node.js](https://nodejs.org/) (для `npx`).

```bash
npm start
```

Откройте в браузере указанный адрес (по умолчанию порт **5173**). Сайт отдаётся из корня репозитория как статика.

## Скрипты обслуживания (не нужны для просмотра сайта)

Запуск из **корня репозитория**, при необходимости с VPN (если CDN ArtStation недоступен).

| Команда | Описание |
|---------|----------|
| `pwsh -File scripts/download-artstation-assets.ps1` | Качает общие статические файлы ArtStation и зеркалирует CDN-изображения в `projects/*/art-cdn/`, переписывает пути в `art.html`, санитизация и slim |
| `pwsh -File scripts/fetch-portfolio.ps1` | Скачивает превью карточек в `assets/portfolio/<id>.jpg` |
| `npm run slim` | Упрощает `projects/*/art.html`: общий `<head>` и `assets/art-embed-shell.js` |

## Лицензия и материалы

Материалы портфолио принадлежат автору. Код и разметка репозитория — по усмотрению владельца (при необходимости добавьте файл `LICENSE`).

---

**English:** Static portfolio for Dmitrii Popov, deployed on GitHub Pages at popov-da.ru. Run locally with `npm start`. Maintenance scripts live in `scripts/`.
