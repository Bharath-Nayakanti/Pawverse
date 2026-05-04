from pathlib import Path
import shutil

DATASET_DIR = Path("data/oxford-iiit-pet")
IMAGES_DIR = DATASET_DIR / "images"
ANNOTATIONS_DIR = DATASET_DIR / "annotations"

LIST_FILE = ANNOTATIONS_DIR / "list.txt"
TRAIN_FILE = ANNOTATIONS_DIR / "trainval.txt"
TEST_FILE = ANNOTATIONS_DIR / "test.txt"

OUTPUT_DIR = Path("data/breed_v2")
TRAIN_DIR = OUTPUT_DIR / "train"
VAL_DIR = OUTPUT_DIR / "val"

IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"]


def check_required_paths():
    required_paths = [IMAGES_DIR, LIST_FILE, TRAIN_FILE, TEST_FILE]

    for path in required_paths:
        if not path.exists():
            raise FileNotFoundError(
                f"Could not find required dataset path: {path}\n"
                "Make sure the Oxford-IIIT Pet Dataset is extracted under "
                "data/oxford-iiit-pet."
            )


def parse_annotation_line(line):
    line = line.strip()

    if not line or line.startswith("#"):
        return None

    parts = line.split()
    if len(parts) < 4:
        return None

    filename = parts[0]
    class_id = int(parts[1])
    species = int(parts[2])
    breed_id = int(parts[3])
    breed = "_".join(filename.split("_")[:-1])

    return {
        "filename": filename,
        "breed": breed,
        "class_id": class_id,
        "species": species,
        "breed_id": breed_id,
    }


def load_image_info():
    image_info = {}

    with LIST_FILE.open("r") as file:
        for line in file:
            info = parse_annotation_line(line)
            if info is None:
                continue

            image_info[info["filename"]] = info

    return image_info


def find_image_path(filename):
    for extension in IMAGE_EXTENSIONS:
        image_path = IMAGES_DIR / f"{filename}{extension}"
        if image_path.exists():
            return image_path

    return None


def process_split(file_path, target_dir, image_info):
    missing_count = 0
    copied_count = 0

    with file_path.open("r") as file:
        for line in file:
            info = parse_annotation_line(line)
            if info is None:
                continue

            filename = info["filename"]
            image_path = find_image_path(filename)

            if image_path is None or filename not in image_info:
                missing_count += 1
                continue

            breed = image_info[filename]["breed"]
            dest_folder = target_dir / breed
            dest_folder.mkdir(parents=True, exist_ok=True)

            shutil.copy2(image_path, dest_folder / image_path.name)
            copied_count += 1

    return copied_count, missing_count


def main():
    check_required_paths()

    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)

    TRAIN_DIR.mkdir(parents=True, exist_ok=True)
    VAL_DIR.mkdir(parents=True, exist_ok=True)

    image_info = load_image_info()

    print("Preparing training set...")
    train_count, missing_train = process_split(TRAIN_FILE, TRAIN_DIR, image_info)

    print("Preparing validation set...")
    val_count, missing_val = process_split(TEST_FILE, VAL_DIR, image_info)

    train_classes = sum(1 for path in TRAIN_DIR.iterdir() if path.is_dir())
    val_classes = sum(1 for path in VAL_DIR.iterdir() if path.is_dir())

    print("\nBreed dataset (v2) ready!")
    print(f"Train images: {train_count}")
    print(f"Val images: {val_count}")
    print(f"Train classes: {train_classes}")
    print(f"Val classes: {val_classes}")

    if missing_train or missing_val:
        print(f"Skipped missing train images: {missing_train}")
        print(f"Skipped missing val images: {missing_val}")


if __name__ == "__main__":
    main()
