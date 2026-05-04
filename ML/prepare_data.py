import random
import shutil
from pathlib import Path

# Paths
SOURCE_DIR = Path("data/oxford-iiit-pet/images")
BASE_DIR = Path("data")

TRAIN_DIR = BASE_DIR / "train"
VAL_DIR = BASE_DIR / "val"

CATEGORIES = ["cats", "dogs"]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
RANDOM_SEED = 42

if not SOURCE_DIR.is_dir():
    raise FileNotFoundError(
        f"Could not find the source image folder: {SOURCE_DIR}\n"
        "Download/extract the Oxford-IIIT Pet Dataset so images live at "
        "data/oxford-iiit-pet/images, then run this script again."
    )

# Create folders
for split in ["train", "val"]:
    for category in CATEGORIES:
        (BASE_DIR / split / category).mkdir(parents=True, exist_ok=True)

# Separate images
cats = []
dogs = []

for image_path in SOURCE_DIR.iterdir():
    if image_path.suffix.lower() not in IMAGE_EXTENSIONS:
        continue

    # Oxford-IIIT pet image names start uppercase for cats and lowercase for dogs.
    if image_path.name[0].isupper():
        cats.append(image_path)
    else:
        dogs.append(image_path)

# Shuffle
random.seed(RANDOM_SEED)
random.shuffle(cats)
random.shuffle(dogs)

# Split (80% train, 20% val)
def split_data(data):
    split_index = int(0.8 * len(data))
    return data[:split_index], data[split_index:]

cats_train, cats_val = split_data(cats)
dogs_train, dogs_val = split_data(dogs)

# Copy files
def copy_files(file_list, category, split):
    output_dir = BASE_DIR / split / category

    for file_path in file_list:
        dst = output_dir / file_path.name
        shutil.copy2(file_path, dst)

copy_files(cats_train, "cats", "train")
copy_files(cats_val, "cats", "val")
copy_files(dogs_train, "dogs", "train")
copy_files(dogs_val, "dogs", "val")

print("Dataset prepared successfully!")
print(f"Train: {len(cats_train)} cats, {len(dogs_train)} dogs")
print(f"Val: {len(cats_val)} cats, {len(dogs_val)} dogs")
