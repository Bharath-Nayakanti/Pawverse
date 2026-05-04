from pathlib import Path
import shutil
import random

SOURCE_DIR = Path("data/oxford-iiit-pet/images")
BASE_DIR = Path("data/breed")

TRAIN_DIR = BASE_DIR / "train"
VAL_DIR = BASE_DIR / "val"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}

random.seed(42)

if not SOURCE_DIR.is_dir():
    raise FileNotFoundError(
        f"Could not find the source image folder: {SOURCE_DIR}\n"
        "Download/extract the Oxford-IIIT Pet Dataset so images live at "
        "data/oxford-iiit-pet/images, then run this script again."
    )

# Start clean so rerunning the script cannot leave stale files behind.
if BASE_DIR.exists():
    shutil.rmtree(BASE_DIR)

TRAIN_DIR.mkdir(parents=True, exist_ok=True)
VAL_DIR.mkdir(parents=True, exist_ok=True)

# Collect breed-wise images
breed_dict = {}

for image_path in SOURCE_DIR.iterdir():
    if image_path.suffix.lower() not in IMAGE_EXTENSIONS:
        continue

    name_parts = image_path.stem.split("_")
    if len(name_parts) < 2 or not name_parts[-1].isdigit():
        print(f"Skipping unexpected filename: {image_path.name}")
        continue

    breed = "_".join(name_parts[:-1])
    breed_dict.setdefault(breed, []).append(image_path)

# Split + copy
for breed, images in breed_dict.items():
    random.shuffle(images)

    split_idx = int(0.8 * len(images))
    train_imgs = images[:split_idx]
    val_imgs = images[split_idx:]

    # Create breed folders
    (TRAIN_DIR / breed).mkdir(parents=True, exist_ok=True)
    (VAL_DIR / breed).mkdir(parents=True, exist_ok=True)

    for img in train_imgs:
        shutil.copy2(img, TRAIN_DIR / breed / img.name)

    for img in val_imgs:
        shutil.copy2(img, VAL_DIR / breed / img.name)

train_count = sum(1 for _ in TRAIN_DIR.glob("*/*"))
val_count = sum(1 for _ in VAL_DIR.glob("*/*"))

print("Breed dataset prepared successfully!")
print(f"Breeds: {len(breed_dict)}")
print(f"Train images: {train_count}")
print(f"Val images: {val_count}")
