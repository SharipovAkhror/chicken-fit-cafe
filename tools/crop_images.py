import os
import shutil
from PIL import Image

UPLOAD_DIR = r"C:\Users\User\.gemini\antigravity-ide\brain\4cb991bd-0743-4ff5-9761-69df3acee95e\.user_uploaded"
MENU_DIR = r"c:\Users\User\Documents\GitHub\chicken-fit-cafe\public\menu"
BANNERS_DIR = r"c:\Users\User\Documents\GitHub\chicken-fit-cafe\public\assets\banners"

os.makedirs(MENU_DIR, exist_ok=True)
os.makedirs(BANNERS_DIR, exist_ok=True)

# 1. Copy full banners
shutil.copy(os.path.join(UPLOAD_DIR, "media_1786735042755.jpg"), os.path.join(BANNERS_DIR, "brand-hero.jpg"))
shutil.copy(os.path.join(UPLOAD_DIR, "media_1786735051464.jpg"), os.path.join(BANNERS_DIR, "super-combo.jpg"))
shutil.copy(os.path.join(UPLOAD_DIR, "media_1786735078652.jpg"), os.path.join(BANNERS_DIR, "lunch-menu.jpg"))
shutil.copy(os.path.join(UPLOAD_DIR, "media_1786735082916.jpg"), os.path.join(BANNERS_DIR, "breakfast-menu.jpg"))
print("Banners copied successfully.")

# Load original poster images
img_combo = Image.open(os.path.join(UPLOAD_DIR, "media_1786735047972.jpg")).convert("RGB")
img_lunch = Image.open(os.path.join(UPLOAD_DIR, "media_1786735078652.jpg")).convert("RGB")
img_breakfast = Image.open(os.path.join(UPLOAD_DIR, "media_1786735082916.jpg")).convert("RGB")

def crop_and_save(img, rel_box, out_name):
    # rel_box is (left, top, right, bottom) in fractions (0.0 - 1.0)
    w, h = img.size
    left = int(rel_box[0] * w)
    top = int(rel_box[1] * h)
    right = int(rel_box[2] * w)
    bottom = int(rel_box[3] * h)
    
    cropped = img.crop((left, top, right, bottom))
    
    # Create square with subtle white padding or resize directly
    target_size = (600, 600)
    # Fit inside 600x600 on white background
    cropped.thumbnail((560, 560), Image.Resampling.LANCZOS)
    
    canvas = Image.new("RGB", target_size, (255, 255, 255))
    offset = ((target_size[0] - cropped.width) // 2, (target_size[1] - cropped.height) // 2)
    canvas.paste(cropped, offset)
    
    out_path = os.path.join(MENU_DIR, out_name)
    canvas.save(out_path, "JPEG", quality=90)
    print(f"Saved {out_name}: size {canvas.size}, {os.path.getsize(out_path)} bytes")

# 1. Chicken & Combo (From Poster 2/3)
crop_and_save(img_combo, (0.05, 0.40, 0.95, 0.85), "combo-chicken.jpg")
crop_and_save(img_combo, (0.35, 0.42, 0.77, 0.78), "chicken-strips.jpg")
crop_and_save(img_combo, (0.75, 0.38, 0.98, 0.84), "compote.jpg")
crop_and_save(img_combo, (0.07, 0.45, 0.38, 0.78), "fries-plate.jpg")

# 2. Soups (From Lunch Poster)
crop_and_save(img_lunch, (0.03, 0.35, 0.25, 0.47), "shchi-green.jpg")
crop_and_save(img_lunch, (0.25, 0.35, 0.48, 0.47), "borscht.jpg")
crop_and_save(img_lunch, (0.48, 0.35, 0.72, 0.47), "chicken-noodles.jpg")
crop_and_save(img_lunch, (0.72, 0.35, 0.97, 0.47), "meatball-soup.jpg")

# 3. Mains (From Lunch Poster)
crop_and_save(img_lunch, (0.03, 0.58, 0.35, 0.71), "cutlet-homemade.jpg")
crop_and_save(img_lunch, (0.35, 0.58, 0.67, 0.71), "kiev-cutlet.jpg")
crop_and_save(img_lunch, (0.67, 0.58, 0.97, 0.71), "kupaty.jpg")
crop_and_save(img_lunch, (0.65, 0.12, 0.95, 0.30), "chicken-kfc-1kg.jpg")

# 4. Breakfast (From Breakfast Poster)
crop_and_save(img_breakfast, (0.04, 0.12, 0.32, 0.20), "pirozhki-potatoes.jpg")
crop_and_save(img_breakfast, (0.04, 0.20, 0.32, 0.28), "sosiska-v-teste.jpg")
crop_and_save(img_breakfast, (0.04, 0.28, 0.32, 0.36), "pirozhki-meat.jpg")
crop_and_save(img_breakfast, (0.04, 0.35, 0.32, 0.43), "blinchiki-meat.jpg")
crop_and_save(img_breakfast, (0.04, 0.43, 0.32, 0.51), "blini-cottage-cheese.jpg")
crop_and_save(img_breakfast, (0.04, 0.50, 0.32, 0.58), "canadian-sausage.jpg")
crop_and_save(img_breakfast, (0.04, 0.57, 0.32, 0.64), "boiled-egg.jpg")
crop_and_save(img_breakfast, (0.04, 0.64, 0.32, 0.72), "fried-egg.jpg")
crop_and_save(img_breakfast, (0.04, 0.72, 0.32, 0.77), "maccoffee-pack.jpg")
crop_and_save(img_breakfast, (0.04, 0.77, 0.32, 0.83), "torabika-pack.jpg")
crop_and_save(img_breakfast, (0.04, 0.83, 0.32, 0.89), "americano-cup.jpg")
crop_and_save(img_breakfast, (0.04, 0.88, 0.35, 0.98), "tea-pot-glass.jpg")

print("All real poster images processed successfully!")
