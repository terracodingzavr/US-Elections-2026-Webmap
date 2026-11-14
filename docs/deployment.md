# Публикация и обновление

## GitHub Pages

1. Создайте пустой публичный репозиторий US-Elections-2026-Webmap в аккаунте terracodingzavr и отправьте исходники в main.
2. В Settings → Pages → Build and deployment выберите GitHub Actions.
3. В Actions запустите Publish map to GitHub Pages, если push уже произошёл. Workflow выполнит npm ci, тесты, валидацию и сборку, затем опубликует dist.
4. Откройте адрес из результата шага deploy. Проверьте загрузку границ по вложенному URL, переключение палат и карточки округов.

## Обновление результатов

1. Склонируйте [исходный набор Pushbuild](https://github.com/pushbuild/us-2026-election-results). Использован коммит 6bc4020986834665b90ababf889bd2cb5ce17bcd. Для воспроизведения снимка примените именно его.
2. Для обновления задайте дату и путь к новому полному [снимку Polling Desk](https://polling-desk.com/results.csv) и обновите data-snapshots/dc.json при появлении нового подсчёта.
3. Если издатель подтвердил сертификацию отдельной гонки, внесите полный документ гонки в data-snapshots/verified-overrides.json, включая status=certified, дату, источник и при наличии winnerName. Записи в overrides применяются после импорта, поэтому их требуется актуализировать при смене снимка.
4. Выполните импорт и проверки. Обновите docs/sources.md и дату в README, выступающие журналом версий.

```bash
python scripts/process_elections.py /path/to/pushbuild/data
python scripts/validate_data.py
npm test
npm run build
```

Для нового снимка передайте дополнительные аргументы `<путь к CSV> <дата YYYY-MM-DD>`. Публикация следует за push в main. Импорт запускается оператором после сверки источников и статуса.

## Воспроизведение геометрии

Требуются GDAL (ogr2ogr), Python 3 и Mapshaper 0.6.113. Скачивайте архивы в новый каталог, чтобы получить свежий снимок. Сверяйте SHA-256 и примечания Census Bureau перед заменой версии.

```bash
python scripts/download_geodata.py .geo-cache
npx --yes --package mapshaper@0.6.113 -c 'python scripts/prepare_geodata.py .geo-cache public/data'
python -m pip install 'shapely==2.1.2'
python scripts/validate_data.py --geometry
```
