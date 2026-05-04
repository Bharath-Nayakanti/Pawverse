from pathlib import Path
import shutil
import random

# -----------------------------
# CONFIG
# -----------------------------
SOURCE_DIR = Path("data/Skin_Disease/CAT_SKIN_DISEASE")
OUTPUT_DIR = Path("data/disease_cat")

TRAIN_DIR = OUTPUT_DIR / "train"
VAL_DIR = OUTPUT_DIR / "val"

SPLIT_RATIO = 0.8
RANDOM_SEED = 42

random.seed(RANDOM_SEED)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}

# -----------------------------
# CLASS MAPPING
# -----------------------------
CLASS_MAPPING = {
    "Health": "healthy",
    "Healthy": "healthy",
    "Ringworm": "fungal_infection",
    "ringworm": "fungal_infection",
    "Scabies": "parasite_infection",
    "Flea_Allergy": "allergy",
    "flea_allergy": "allergy",
}

FILENAME_CLASS_HINTS = {
    "flea_allergy": "allergy",
    "flea-allergy": "allergy",
}


def check_source_data():
    """Verify source directory exists and contains class folders."""
    if not SOURCE_DIR.is_dir():
        raise FileNotFoundError(
            f"Could not find cat skin disease source folder: {SOURCE_DIR}"
        )


def list_images(folder):
    """Get all image files from a folder."""
    return [
        image_path
        for image_path in folder.iterdir()
        if image_path.is_file() and image_path.suffix.lower() in IMAGE_EXTENSIONS
    ]


def get_mapped_class(original_class, image_path):
    """Get mapped class name with filename hints support."""
    filename = image_path.name.lower()

    for hint, mapped_class in FILENAME_CLASS_HINTS.items():
        if hint in filename:
            return mapped_class

    return CLASS_MAPPING.get(original_class)


def main():
    check_source_data()

    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)

    TRAIN_DIR.mkdir(parents=True, exist_ok=True)
    VAL_DIR.mkdir(parents=True, exist_ok=True)

    # Collect all images by class
    class_images = {}

    for class_folder in sorted(SOURCE_DIR.iterdir()):
        if not class_folder.is_dir():
            continue

        original_class = class_folder.name

        if original_class not in CLASS_MAPPING:
            print(f"Skipping unknown class: {original_class}")
            continue

        images = list_images(class_folder)

        if not images:
            print(f"No images found in {original_class}")
            continue

        # Group by mapped class
        for image_path in images:
            mapped_class = get_mapped_class(original_class, image_path)
            if mapped_class not in class_images:
                class_images[mapped_class] = []
            class_images[mapped_class].append(image_path)

    # Split and copy
    total_counts = {}

    for cls, images in sorted(class_images.items()):
        random.shuffle(images)

        split_index = int(len(images) * SPLIT_RATIO)
        train_imgs = images[:split_index]
        val_imgs = images[split_index:]

        (TRAIN_DIR / cls).mkdir(parents=True, exist_ok=True)
        (VAL_DIR / cls).mkdir(parents=True, exist_ok=True)

        for img in train_imgs:
            shutil.copy2(img, TRAIN_DIR / cls / img.name)

        for img in val_imgs:
            shutil.copy2(img, VAL_DIR / cls / img.name)

        total_counts[cls] = len(images)
        print(f"{cls}: {len(train_imgs)} train, {len(val_imgs)} val")

    total_images = sum(total_counts.values())
    total_classes = len(total_counts)

    print("\n✅ Cat disease dataset prepared successfully!")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Classes: {total_classes}")
    print(f"Total images: {total_images}")


if __name__ == "__main__":
    main()