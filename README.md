# Джйотиш · контроль питания

Веб-приложение ежедневного протокола питания с расчётом лунного дня, титхи, транзитной накшатры и матрицы обедов (Next.js + локальный движок правил). Опционально — Python-бэкенд через прокси.

## Быстрый старт (только фронтенд)

Требуется **Node.js 18+**.

Из **корня проекта** (рядом с этим `README.md`):

```bash
npm install
npm run dev
```

Либо классически из каталога `frontend`:

```bash
cd frontend
npm install
npm run dev
```

В **PowerShell** цепочку команд пишите через точку с запятой, не через `&&`:  
`cd frontend; npm run dev`

На Windows можно открыть сайт двойным щелчком по **`Запуск-dev.bat`** в корне (после `npm install`).

По умолчанию **`npm run dev`** запускает **Turbopack** (`--turbo`) — на Windows это заметно стабильнее, чем Webpack в dev: меньше битого `.next` и ошибок вроде `Cannot find module './276.js'` (из‑за них страница ошибки выглядит «чёрно‑белой» без ваших стилей). Если нужен старый бандлер: **`npm run dev:webpack`**.

Откройте [http://localhost:3000](http://localhost:3000) — редирект на «Сегодня».

Продакшен-сборка:

```bash
npm run build
npm run start
```

Сервер слушает **порт 3000** (скрипты зафиксированы в `package.json`, чтобы не путаться с переменной `PORT` в окружении).

## Windows: ярлык и «приложение»

В каталоге **`windows/`**:

- **`Протокол.bat`** — двойной щелчок: при необходимости выполнит `npm run build`, откроет отдельное окно с сервером и браузер на «Сегодня».
- **`Start-Protocol.ps1`** — то же из PowerShell: `.\Start-Protocol.ps1` или `.\Start-Protocol.ps1 -Dev` для режима разработки.
- **`New-DesktopShortcut.ps1`** — создаёт на рабочем столе ярлык «Протокол дня», который запускает `Start-Protocol.ps1`.

После первого запуска сервера откройте сайт в **Microsoft Edge** или **Chrome** → меню **«Установить приложение»** / **«Приложение»** / **«Создать ярлык…»** — появится отдельное окно PWA (используется `public/site.webmanifest` и иконка `public/icons/app-icon.svg`).

При ошибке выполнения скриптов один раз выполните в PowerShell:  
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

## Переменные окружения

В `frontend/.env.local` (не коммитится):

- `NEXT_PROXY_API` — если задан (например `http://127.0.0.1:8000`), запросы к `/api/*` сначала пробуют этот бэкенд; при ошибке используется встроенный mock-движок.

## Python-бэкенд (опционально)

```bash
cd backend
# создайте venv и установите зависимости по pyproject/requirements проекта
```

Запускайте API и при необходимости укажите `NEXT_PROXY_API` для фронтенда.

## Тесты

```bash
cd frontend
npm test
```

## Публикация на GitHub

1. Создайте пустой репозиторий на GitHub.
2. В корне проекта:

```bash
git init
git add .
git commit -m "Initial commit: Jyotish nutrition protocol app"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

Не коммитьте `.env.local` и `node_modules/` — они уже в `.gitignore`.
