from pathlib import Path
import shutil

# -----------------------------
# CONFIG
# -----------------------------
SOURCE_DIR = Path("data/Skin_Disease/Dog_Skin_Disease")
OUTPUT_DIR = Path("data/disease_dog")

SOURCE_SPLITS = {
    "train": "train",
    "valid": "val",
    "test": "test",
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}

# -----------------------------
# CLASS MAPPING
# -----------------------------
CLASS_MAPPING = {
    "Healthy": "healthy",
    "Ringworm": "fungal_infection",
    "ringworm": "fungal_infection",
    "Fungal_infections": "fungal_infection",
    "demodicosis": "parasite_infection",
    "Dermatitis": "skin_inflammation",
    "Hypersensitivity": "allergy",
}

FILENAME_CLASS_HINTS = {
    "flea_allergy": "allergy",
    "flea-allergy": "allergy",
}


def check_source_data():
    if not SOURCE_DIR.is_dir():
        raise FileNotFoundError(
            f"Could not find dog skin disease source folder: {SOURCE_DIR}"
        )

    missing_splits = [
        split for split in SOURCE_SPLITS if not (SOURCE_DIR / split).is_dir()
    ]
    if missing_splits:
        raise FileNotFoundError(
            f"Missing source split folders in {SOURCE_DIR}: {missing_splits}"
        )


def list_images(folder):
    return [
        image_path
        for image_path in folder.iterdir()
        if image_path.is_file() and image_path.suffix.lower() in IMAGE_EXTENSIONS
    ]


def copy_image(image_path, dest_folder, source_class):
    dest_path = dest_folder / image_path.name

    if dest_path.exists():
        dest_path = dest_folder / f"{source_class}_{image_path.name}"

    shutil.copy2(image_path, dest_path)


def get_mapped_class(original_class, image_path):
    filename = image_path.name.lower()

    for hint, mapped_class in FILENAME_CLASS_HINTS.items():
        if hint in filename:
            return mapped_class

    return CLASS_MAPPING.get(original_class)


def process_split(source_split, output_split):
    source_split_dir = SOURCE_DIR / source_split
    output_split_dir = OUTPUT_DIR / output_split
    output_split_dir.mkdir(parents=True, exist_ok=True)

    split_counts = {}

    for class_folder in sorted(source_split_dir.iterdir()):
        if not class_folder.is_dir():
            continue

        original_class = class_folder.name

        if original_class not in CLASS_MAPPING:
            print(f"Skipping unknown class: {original_class}")
            continue

        images = list_images(class_folder)

        for image_path in images:
            mapped_class = get_mapped_class(original_class, image_path)
            dest_folder = output_split_dir / mapped_class
            dest_folder.mkdir(parents=True, exist_ok=True)
            copy_image(image_path, dest_folder, original_class)
            split_counts[mapped_class] = split_counts.get(mapped_class, 0) + 1

    return split_counts


def print_split_counts(output_split, split_counts):
    print(f"\n{output_split}:")
    for class_name, count in sorted(split_counts.items()):
        print(f"  {class_name}: {count}")


def main():
    check_source_data()

    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)

    total_counts = {}

    for source_split, output_split in SOURCE_SPLITS.items():
        split_counts = process_split(source_split, output_split)
        print_split_counts(output_split, split_counts)

        for class_name, count in split_counts.items():
            total_counts[class_name] = total_counts.get(class_name, 0) + count

    total_images = sum(total_counts.values())
    total_classes = len(total_counts)

    print("\nDog disease dataset prepared successfully!")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Classes: {total_classes}")
    print(f"Total images: {total_images}")


if __name__ == "__main__":
    main()
