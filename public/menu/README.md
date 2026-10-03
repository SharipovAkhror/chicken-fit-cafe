# Фото блюд

- Оригиналы: `public/menu/<id>.jpg|webp` — гостевое меню (`image_url` = `/menu/<file>`).
- Миниатюры для кассы: `public/menu/thumb/<id>.webp`, 240×240, ~12 КБ (`thumbOf()` в `features/pos/ProductCard.tsx`).
  Без миниатюры касса показывает иконку. Сделать миниатюру:
  `ffmpeg -i public/menu/x.jpg -vf "scale=240:240:force_original_aspect_ratio=increase,crop=240:240" -q:v 80 public/menu/thumb/x.webp`
