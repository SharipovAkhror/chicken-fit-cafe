#!/usr/bin/env python3
"""Собирает фирменный PDF-брендбук ChickenFit с кириллицей и изображениями."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = "/vercel/share/v0-project"
HERE = os.path.join(ROOT, "tools/brandbook-pdf")
FONT_DIR = os.path.join(ROOT, "node_modules/dejavu-fonts-ttf/ttf")
OUT = os.path.join(ROOT, "ChickenFit-Brandbook-v1.pdf")

pdfmetrics.registerFont(TTFont("Brand", os.path.join(FONT_DIR, "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("Brand-Bold", os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")))

PASTRY = (0.953, 0.906, 0.827)
TERRA = (0.725, 0.302, 0.184)
GRAPHITE = (0.157, 0.129, 0.114)
OLIVE = (0.400, 0.455, 0.278)
WHITE = (1, 1, 1)
CREAM2 = (0.918, 0.863, 0.773)

PW, PH = A4
ML = 20 * mm
MR = PW - 20 * mm
CW = MR - ML

c = canvas.Canvas(OUT, pagesize=A4)


def bg(color):
    c.setFillColorRGB(*color)
    c.rect(0, 0, PW, PH, fill=1, stroke=0)


def text(x, y, s, font="Brand", size=11, color=GRAPHITE, spacing=None):
    c.setFillColorRGB(*color)
    c.setFont(font, size)
    if spacing:
        c.setCharSpace(spacing)
    c.drawString(x, y, s)
    c.setCharSpace(0)


def centered(x, y, s, font="Brand", size=11, color=GRAPHITE):
    c.setFillColorRGB(*color)
    c.setFont(font, size)
    c.drawCentredString(x, y, s)


def wrap(x, y, s, width, font="Brand", size=10.5, color=GRAPHITE, leading=15):
    c.setFillColorRGB(*color)
    c.setFont(font, size)
    words = s.split()
    line = ""
    for w in words:
        test = (line + " " + w).strip()
        if pdfmetrics.stringWidth(test, font, size) <= width:
            line = test
        else:
            c.drawString(x, y, line)
            y -= leading
            line = w
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y


def bullets(x, y, items, width, size=10.5, leading=15, gap=5, color=GRAPHITE):
    for it in items:
        c.setFillColorRGB(*TERRA)
        c.setFont("Brand-Bold", size)
        c.drawString(x, y, "•")
        ny = wrap(x + 5 * mm, y, it, width - 5 * mm, size=size, color=color, leading=leading)
        y = ny - gap
    return y


def layers(cx, y, w=34 * mm, h=5 * mm, offs=(0, 8, 4), cols=(TERRA, OLIVE, TERRA)):
    for i, off in enumerate(offs):
        c.setFillColorRGB(*cols[i])
        c.roundRect(cx + off * mm, y - i * (h + 2.5 * mm), w, h, 2.2 * mm, fill=1, stroke=0)


def kicker(s):
    text(ML, PH - 26 * mm, s.upper(), font="Brand-Bold", size=9, color=TERRA, spacing=2)


def h2(s, y=None):
    yy = PH - 34 * mm if y is None else y
    text(ML, yy, s, font="Brand-Bold", size=22, color=GRAPHITE)
    return yy


def foot(n):
    c.setStrokeColorRGB(*OLIVE)
    text(ML, 12 * mm, "CHICKENFIT BRANDBOOK", font="Brand", size=8, color=OLIVE, spacing=1.5)
    c.setFillColorRGB(*OLIVE)
    c.setFont("Brand", 8)
    c.drawRightString(MR, 12 * mm, f"{n:02d}")


def card(x, y, w, h, fill, radius=4 * mm, border=None):
    c.setFillColorRGB(*fill)
    if border:
        c.setStrokeColorRGB(*border)
        c.setLineWidth(0.8)
        c.roundRect(x, y, w, h, radius, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, radius, fill=1, stroke=0)


def image(path, x, y, w, h):
    img = ImageReader(path)
    iw, ih = img.getSize()
    ar = iw / ih
    tar = w / h
    if ar > tar:
        nh = h
        nw = h * ar
        ox = x - (nw - w) / 2
        oy = y
    else:
        nw = w
        nh = w / ar
        ox = x
        oy = y - (nh - h) / 2
    c.saveState()
    p = c.beginPath()
    p.roundRect(x, y, w, h, 4 * mm)
    c.clipPath(p, stroke=0, fill=0)
    c.drawImage(img, ox, oy, nw, nh, mask="auto")
    c.restoreState()
    c.setStrokeColorRGB(*CREAM2)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, 4 * mm, fill=0, stroke=1)


# ---------- COVER ----------
bg(GRAPHITE)
text(ML, PH - 22 * mm, "BRANDBOOK v1", font="Brand", size=9, color=PASTRY, spacing=2)
c.setFillColorRGB(*PASTRY)
c.setFont("Brand", 9)
c.drawRightString(MR, PH - 22 * mm, "SAMARKAND · 2026")
c.setFont("Brand-Bold", 52)
c.setFillColorRGB(*PASTRY)
c.drawString(ML, PH / 2 + 30 * mm, "Chicken")
cw = pdfmetrics.stringWidth("Chicken", "Brand-Bold", 52)
c.setFillColorRGB(*TERRA)
c.drawString(ML + cw, PH / 2 + 30 * mm, "Fit")
layers(ML, PH / 2 + 12 * mm, cols=(TERRA, OLIVE, PASTRY))
wrap(ML, PH / 2 - 12 * mm,
     "Современный локальный обед у аэропорта Самарканда. Слоёное тесто, сочная курица, тёплый сервис.",
     120 * mm, size=14, color=PASTRY, leading=22)
text(ML, 20 * mm, "РУКОВОДСТВО ПО БРЕНДУ · ВНУТРЕННИЙ ДОКУМЕНТ", font="Brand", size=8, color=PASTRY, spacing=1.5)
c.showPage()

# ---------- 01 FOUNDATION ----------
bg(PASTRY)
kicker("01 · Основа")
y = h2("Кто мы и что обещаем")
y = wrap(ML, y - 12 * mm,
         "ChickenFit — современный fast-casual у аэропорта Самарканда. Мы подаём узнаваемую "
         "самаркандскую форму — слоёное тесто — с понятной куриной начинкой. Быстрее ресторана, "
         "качественнее обычного фастфуда.", CW, size=12, leading=18)
gy = y - 8 * mm
gh = 30 * mm
gw = (CW - 8 * mm) / 2
data = [
    ("Формат", "Современный fast-casual: зал, навынос и доставка на старте.", WHITE, GRAPHITE),
    ("Место", "У аэропорта Самарканда, рядом с крупными работодателями.", WHITE, GRAPHITE),
    ("Продукт-герой", "Куриный гибрид бургера и самсы в слоёном тесте.", TERRA, PASTRY),
    ("Обещание", "Сытный современный обед, который подходит ритму рабочего дня.", GRAPHITE, PASTRY),
]
for i, (t, b, fill, txt) in enumerate(data):
    col = i % 2
    row = i // 2
    x = ML + col * (gw + 8 * mm)
    yy = gy - row * (gh + 8 * mm) - gh
    card(x, yy, gw, gh, fill, border=CREAM2 if fill == WHITE else None)
    text(x + 6 * mm, yy + gh - 10 * mm, t, font="Brand-Bold", size=12, color=txt)
    wrap(x + 6 * mm, yy + gh - 17 * mm, b, gw - 12 * mm, size=10, color=txt, leading=13)
ny = gy - 2 * (gh + 8 * mm)
text(ML, ny, "Имя", font="Brand-Bold", size=14, color=GRAPHITE)
wrap(ML, ny - 8 * mm,
     "ChickenFit. «Fit» — это «подходит»: обед, который вписывается в короткий перерыв и в характер "
     "современного Самарканда. Это не про диету, а про уместность и удобство.", CW, size=11, leading=16)
foot(1)
c.showPage()

# ---------- 02 AUDIENCE ----------
bg(PASTRY)
kicker("02 · Аудитория и позиционирование")
y = h2("Для кого и против кого")
colw = (CW - 10 * mm) / 2
text(ML, y - 14 * mm, "Аудитория", font="Brand-Bold", size=14, color=GRAPHITE)
bullets(ML, y - 22 * mm, [
    "Приоритет — сотрудники крупных компаний рядом и местные жители.",
    "Главный сценарий — сытный обед в ограниченный перерыв.",
    "Каналы — зал, навынос и доставка.",
], colw)
text(ML + colw + 10 * mm, y - 14 * mm, "Мы НЕ", font="Brand-Bold", size=14, color=GRAPHITE)
bullets(ML + colw + 10 * mm, y - 22 * mm, [
    "не обычная бургерная;",
    "не традиционная самса-точка;",
    "не дешёвый фастфуд;",
    "не премиальный ресторан.",
], colw)
qy = y - 62 * mm
card(ML, qy - 26 * mm, CW, 26 * mm, OLIVE)
wrap(ML + 8 * mm, qy - 8 * mm,
     "«Узнаваемая самаркандская форма с понятной куриной начинкой — быстрее ресторана, качественнее фастфуда.»",
     CW - 16 * mm, font="Brand-Bold", size=13, color=PASTRY, leading=19)
vy = qy - 40 * mm
text(ML, vy, "Характер и ценности", font="Brand-Bold", size=14, color=GRAPHITE)
bullets(ML, vy - 8 * mm, [
    "гордость за современный Самарканд без фольклора;",
    "гостеприимство и уважение к гостю как часть локальности;",
    "ясность и честность вместо агрессивного маркетинга;",
    "тёплый, уверенный, несуетливый тон.",
], CW)
foot(2)
c.showPage()

# ---------- 03 LOGO ----------
bg(PASTRY)
kicker("03 · Логотип")
y = h2("Знак ChickenFit")
card(ML, y - 52 * mm, CW, 44 * mm, WHITE, border=CREAM2)
c.setFont("Brand-Bold", 40)
total = pdfmetrics.stringWidth("ChickenFit", "Brand-Bold", 40)
sx = ML + CW / 2 - total / 2
c.setFillColorRGB(*GRAPHITE)
c.drawString(sx, y - 26 * mm, "Chicken")
c.setFillColorRGB(*TERRA)
c.drawString(sx + pdfmetrics.stringWidth("Chicken", "Brand-Bold", 40), y - 26 * mm, "Fit")
layers(ML + CW / 2 - 17 * mm, y - 34 * mm, w=34 * mm, h=4 * mm)
ly = y - 62 * mm
colw = (CW - 10 * mm) / 2
text(ML, ly, "Правила", font="Brand-Bold", size=14, color=GRAPHITE)
bullets(ML, ly - 8 * mm, [
    "Пишется слитно, с заглавными C и F: ChickenFit.",
    "Chicken — графит, Fit — терракота на светлом фоне.",
    "Модуль из трёх смещённых слоёв сопровождает знак.",
    "Версии: горизонтальная, монограмма CF, одноцветные.",
], colw)
text(ML + colw + 10 * mm, ly, "Нельзя", font="Brand-Bold", size=14, color=GRAPHITE)
bullets(ML + colw + 10 * mm, ly - 8 * mm, [
    "купола, самолёты, силуэты курицы, колпаки;",
    "орнамент и «восточный» декор;",
    "деформация, тени и контуры знака;",
    "пятый цвет или градиент в логотипе.",
], colw)
gy = ly - 58 * mm
text(ML, gy, "Охранное поле", font="Brand-Bold", size=14, color=GRAPHITE)
wrap(ML, gy - 8 * mm,
     "Свободное поле вокруг знака равно высоте одной буквы. Минимальная ширина словесного знака — "
     "28 мм в печати и 112 px на экране.", CW, size=11, leading=16)
foot(3)
c.showPage()

# ---------- 04 COLOR ----------
bg(PASTRY)
kicker("04 · Цвет")
y = h2("Палитра из четырёх цветов")
wrap(ML, y - 12 * mm,
     "Распределение 60 / 25 / 10 / 5. Без градиентов. Никакие дополнительные акценты не добавляются.",
     CW, size=12, leading=17)
sw = (CW - 3 * 6 * mm) / 4
sy = y - 22 * mm
swatches = [
    ("Тёплое тесто", "#F3E7D3", PASTRY, "Фон · 60%"),
    ("Тёплый графит", "#28211D", GRAPHITE, "Текст · 25%"),
    ("Печёная терракота", "#B94D2F", TERRA, "Бренд · 10%"),
    ("Лист оливы", "#667447", OLIVE, "Свежесть · 5%"),
]
for i, (nm, hx, col, role) in enumerate(swatches):
    x = ML + i * (sw + 6 * mm)
    c.setFillColorRGB(*col)
    c.roundRect(x, sy - 30 * mm, sw, 30 * mm, 3 * mm, fill=1, stroke=0)
    card(x, sy - 30 * mm - 22 * mm, sw, 22 * mm, WHITE, border=CREAM2)
    text(x + 4 * mm, sy - 30 * mm - 9 * mm, nm, font="Brand-Bold", size=9.5, color=GRAPHITE)
    text(x + 4 * mm, sy - 30 * mm - 14 * mm, hx, font="Brand", size=9, color=TERRA)
    text(x + 4 * mm, sy - 30 * mm - 19 * mm, role, font="Brand", size=8.5, color=OLIVE)
py = sy - 64 * mm
text(ML, py, "Правила пар", font="Brand-Bold", size=14, color=GRAPHITE)
bullets(ML, py - 8 * mm, [
    "Основные пары: графит на тесте и тесто на графите.",
    "Терракота — основная кнопка; текст на ней светлый, только после проверки контраста.",
    "Олива — информационный акцент, а не второй CTA.",
], CW)
foot(4)
c.showPage()

# ---------- 05 TYPOGRAPHY ----------
bg(PASTRY)
kicker("05 · Типографика")
y = h2("Два шрифта")
colw = (CW - 8 * mm) / 2
card(ML, y - 46 * mm, colw, 38 * mm, WHITE, border=CREAM2)
text(ML + 6 * mm, y - 18 * mm, "Unbounded", font="Brand-Bold", size=14, color=GRAPHITE)
wrap(ML + 6 * mm, y - 25 * mm, "Заголовки и знак. Веса 600–700.", colw - 12 * mm, size=10, leading=13)
text(ML + 6 * mm, y - 35 * mm, "Горячий обед", font="Brand-Bold", size=16, color=GRAPHITE)
card(ML + colw + 8 * mm, y - 46 * mm, colw, 38 * mm, WHITE, border=CREAM2)
text(ML + colw + 14 * mm, y - 18 * mm, "Manrope", font="Brand-Bold", size=14, color=GRAPHITE)
wrap(ML + colw + 14 * mm, y - 25 * mm, "Текст, меню, интерфейс. Веса 400–700.", colw - 12 * mm, size=10, leading=13)
wrap(ML + colw + 14 * mm, y - 33 * mm,
     "Слоёное тесто, сочная курица, свежая зелень и соус.", colw - 12 * mm, size=10, leading=13)
ty = y - 56 * mm
text(ML, ty, "Шкала", font="Brand-Bold", size=14, color=GRAPHITE)
rows = [
    ("Роль", "Семейство", "Вес", "Размер / интерлиньяж", True),
    ("Display", "Unbounded", "700", "48/52+", False),
    ("H1", "Unbounded", "700", "36/42", False),
    ("H2", "Unbounded", "600", "28/34", False),
    ("Body", "Manrope", "400", "16/24", False),
    ("Label", "Manrope", "700", "14/20", False),
    ("Caption", "Manrope", "500", "14/20 минимум", False),
]
ry = ty - 8 * mm
cols_x = [ML, ML + 45 * mm, ML + 95 * mm, ML + 115 * mm]
for (a, b, d, e, hdr) in rows:
    f = "Brand-Bold" if hdr else "Brand"
    col = GRAPHITE
    text(cols_x[0], ry, a, font=f, size=10, color=col)
    text(cols_x[1], ry, b, font=f, size=10, color=col)
    text(cols_x[2], ry, d, font=f, size=10, color=col)
    text(cols_x[3], ry, e, font=f, size=10, color=col)
    c.setStrokeColorRGB(*CREAM2)
    c.setLineWidth(0.6)
    c.line(ML, ry - 3 * mm, MR, ry - 3 * mm)
    ry -= 9 * mm
wrap(ML, ry - 2 * mm,
     "Требование: полный набор узбекской латиницы и кириллицы. Не использовать текст мельче 14 px.",
     CW, size=10.5, leading=15)
foot(5)
c.showPage()

# ---------- 06 MOTIF + CONCEPT ----------
bg(PASTRY)
kicker("06 · Модуль и фотостиль")
y = h2("Слои и продукт")
colw = (CW - 8 * mm) / 2
text(ML, y - 14 * mm, "Фирменный модуль", font="Brand-Bold", size=13, color=GRAPHITE)
wrap(ML, y - 21 * mm,
     "Три неровно смещённых горизонтальных слоя одинаковой толщины. Подложка знака, рамка для "
     "разреза, разделитель меню, паттерн упаковки.", colw, size=10, leading=14)
card(ML, y - 62 * mm, colw, 26 * mm, WHITE, border=CREAM2)
layers(ML + colw / 2 - 17 * mm, y - 44 * mm, w=34 * mm, h=4 * mm)
text(ML + colw + 8 * mm, y - 14 * mm, "Фотостиль", font="Brand-Bold", size=13, color=GRAPHITE)
bullets(ML + colw + 8 * mm, y - 21 * mm, [
    "ключевой кадр — разрез продукта под 30–45°;",
    "видимые слои теста, сочная курица, соус;",
    "тёплый направленный свет, натуральные тени;",
    "момент передачи заказа как знак сервиса;",
    "без восточного реквизита и коллажей.",
], colw, size=10, leading=13, gap=3)
iy = y - 70 * mm
image(os.path.join(HERE, "concept.png"), ML, iy - 95 * mm, CW, 95 * mm)
text(ML, iy - 100 * mm, "КОНЦЕПТ-БОРД ВИЗУАЛЬНОЙ СИСТЕМЫ", font="Brand", size=8, color=OLIVE, spacing=1)
foot(6)
c.showPage()

# ---------- 07 PACKAGING ----------
bg(PASTRY)
kicker("07 · Носители")
y = h2("Упаковка")
image(os.path.join(HERE, "packaging.png"), ML, y - 118 * mm, CW, 110 * mm)
text(ML, y - 123 * mm, "СИСТЕМА УПАКОВКИ", font="Brand", size=8, color=OLIVE, spacing=1)
wrap(ML, y - 132 * mm,
     "Внешняя сторона: тёплый фон, терракотовый знак, короткое имя продукта. Внутренняя сторона: "
     "паттерн слоёв и человеческое сообщение. Конструкция удерживает крошки слоёного теста и "
     "позволяет есть одной рукой — функциональное требование к продукту.", CW, size=11, leading=16)
foot(7)
c.showPage()

# ---------- 08 STOREFRONT + DIGITAL ----------
bg(PASTRY)
kicker("08 · Точка и digital")
y = h2("Сервис и экран")
image(os.path.join(HERE, "storefront.png"), ML, y - 112 * mm, CW, 104 * mm)
text(ML, y - 117 * mm, "ТОЧКА, СЕРВИС И ЦИФРОВОЙ ЗАКАЗ", font="Brand", size=8, color=OLIVE, spacing=1)
colw = (CW - 8 * mm) / 2
dy = y - 126 * mm
text(ML, dy, "Точка", font="Brand-Bold", size=12, color=GRAPHITE)
wrap(ML, dy - 7 * mm,
     "Графитовая или песочная плоскость, терракотовые объёмные буквы с тёплой подсветкой, один "
     "крупный продуктовый кадр.", colw, size=10, leading=13)
text(ML + colw + 8 * mm, dy, "Digital", font="Brand-Bold", size=12, color=GRAPHITE)
wrap(ML + colw + 8 * mm, dy - 7 * mm,
     "Светлая кремовая основа, терракотовая кнопка. Карточка строится слоями: название → состав → "
     "цена → действие. Mobile-first.", colw, size=10, leading=13)
foot(8)
c.showPage()

# ---------- 09 VOICE ----------
bg(PASTRY)
kicker("09 · Голос бренда")
y = h2("Как мы говорим")
wrap(ML, y - 12 * mm,
     "Тёпло + ясно + уверенно. Мы говорим как хороший современный хозяин: замечаем гостя, уважаем "
     "его время, объясняем еду без лишнего шума.", CW, size=12, leading=17)
colw = (CW - 8 * mm) / 2
by = y - 26 * mm
card(ML, by - 52 * mm, colw, 52 * mm, (0.90, 0.92, 0.86), border=OLIVE)
text(ML + 6 * mm, by - 10 * mm, "Говорим", font="Brand-Bold", size=13, color=GRAPHITE)
bullets(ML + 6 * mm, by - 18 * mm, [
    "«Горячий обед готов»",
    "«Собираем при вас»",
    "«Хрустящие слои, сочная курица»",
    "«Рады, что вы с нами»",
], colw - 12 * mm, size=10, leading=13, gap=3)
card(ML + colw + 8 * mm, by - 52 * mm, colw, 52 * mm, (0.95, 0.88, 0.85), border=TERRA)
text(ML + colw + 14 * mm, by - 10 * mm, "Не говорим", font="Brand-Bold", size=13, color=GRAPHITE)
bullets(ML + colw + 14 * mm, by - 18 * mm, [
    "«Самый невероятный вкус в мире»",
    "«Успей купить прямо сейчас!»",
    "«Революционная самса»",
    "«Восточная сказка»",
], colw - 12 * mm, size=10, leading=13, gap=3)
my = by - 62 * mm
text(ML, my, "Меню", font="Brand-Bold", size=14, color=GRAPHITE)
wrap(ML, my - 8 * mm,
     "Название → понятное описание → состав → цена. Сначала способ приготовления и главный "
     "ингредиент, затем соус и свежие добавки. Русский, узбекский и английский не переводятся "
     "механически — сначала утверждается смысл, затем естественная локализация.", CW, size=11, leading=16)
foot(9)
c.showPage()

# ---------- 10 RULES ----------
bg(PASTRY)
kicker("10 · Свод правил")
y = h2("Можно и нельзя")
colw = (CW - 8 * mm) / 2
by = y - 14 * mm
card(ML, by - 52 * mm, colw, 52 * mm, (0.90, 0.92, 0.86), border=OLIVE)
text(ML + 6 * mm, by - 10 * mm, "Можно", font="Brand-Bold", size=13, color=GRAPHITE)
bullets(ML + 6 * mm, by - 18 * mm, [
    "показывать продукт крупно и честно;",
    "использовать модуль слоёв сдержанно;",
    "держать четыре цвета и два шрифта;",
    "говорить тепло, коротко и по делу.",
], colw - 12 * mm, size=10, leading=13, gap=3)
card(ML + colw + 8 * mm, by - 52 * mm, colw, 52 * mm, (0.95, 0.88, 0.85), border=TERRA)
text(ML + colw + 14 * mm, by - 10 * mm, "Нельзя", font="Brand-Bold", size=13, color=GRAPHITE)
bullets(ML + colw + 14 * mm, by - 18 * mm, [
    "добавлять пятый цвет или градиент;",
    "орнамент, купола, самолёты, персонажи;",
    "перегружать носители коллажами;",
    "смешивать акценты A и C сразу.",
], colw - 12 * mm, size=10, leading=13, gap=3)
fy = by - 62 * mm
text(ML, fy, "Что ещё финализируется", font="Brand-Bold", size=14, color=GRAPHITE)
bullets(ML, fy - 8 * mm, [
    "товарное имя флагманского продукта;",
    "финальные векторные ассеты логотипа и favicon;",
    "локализованные тексты меню на трёх языках;",
    "формат курицы и теста по итогам тестов;",
    "проверка шрифтов на полноту узбекских знаков.",
], CW, size=10.5, leading=14)
sy = fy - 62 * mm
card(ML, sy - 22 * mm, CW, 22 * mm, GRAPHITE)
wrap(ML + 8 * mm, sy - 8 * mm,
     "Название ChickenFit утверждено. Документ принят как источник истины для финального логотипа, "
     "продуктового UI и коммуникаций.", CW - 16 * mm, size=11, color=PASTRY, leading=16)
foot(10)
c.showPage()

c.save()
print(OUT)
