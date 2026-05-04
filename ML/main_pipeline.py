"""
Main Pipeline: AI Pet Health Assistant

Combines image-based disease detection with symptom-based diagnosis
for comprehensive pet health assessment.
"""

from pathlib import Path
import sys

from predict_disease_unified import predict_disease
from hybrid_symptom_chatbot import HybridSymptomChecker, DISEASE_INFO
from predict_species import predict_species



# ============================================================================
# RESULT COMBINATION
# ============================================================================
def combine_results(image_result, symptom_result):
    """
    Combine image and symptom predictions into final diagnosis.
    """

    combined_scores = {}

    # Image scores (0–10 scale)
    if image_result:
        condition = image_result["condition"]
        confidence = image_result["confidence"]

        combined_scores[condition] = confidence * 10

        for alt in image_result.get("alternatives", []):
            alt_class = alt["class"]
            alt_score = alt["confidence"] * 5
            combined_scores[alt_class] = combined_scores.get(alt_class, 0) + alt_score

    # Normalized symptom scores (0–10 scale)
    if symptom_result:
        ranked = symptom_result.get("ranked", [])
        if ranked:
            max_score = max(score for _, score in ranked) or 1

            for disease, score in ranked:
                normalized = (score / max_score) * 10
                combined_scores[disease] = combined_scores.get(disease, 0) + normalized

    return sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)


# ============================================================================
# USER INPUT
# ============================================================================
def print_header(text, width=60):
    print(f"\n{'=' * width}")
    print(f"  {text.upper()}")
    print(f"{'=' * width}\n")


def get_yes_no(prompt):
    while True:
        ans = input(prompt).strip().lower()
        if ans in ["yes", "no", "y", "n"]:
            return ans in ["yes", "y"]
        print("Please answer 'yes' or 'no'")


def normalize_species(species):
    """Normalize species name to singular form."""
    species = species.lower().strip()
    if species in ["dogs", "dog"]:
        return "dog"
    elif species in ["cats", "cat"]:
        return "cat"
    return species


def get_species():
    while True:
        sp = input("Is your pet a dog or cat? ").strip().lower()
        sp = normalize_species(sp)
        if sp in ["dog", "cat"]:
            return sp
        print("Enter 'dog' or 'cat'")


def get_image_path():
    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
    
    while True:
        path = input("Enter image path (or press Enter to skip): ").strip()
        if not path:
            return None
        
        p = Path(path).resolve()
        
        # If it's a directory, search for images in it
        if p.is_dir():
            images = [
                img for img in p.iterdir()
                if img.is_file() and img.suffix.lower() in IMAGE_EXTENSIONS
            ]
            
            if images:
                print(f"\nFound {len(images)} image(s) in directory:")
                for i, img in enumerate(images[:5], 1):
                    print(f"  {i}. {img.name}")
                if len(images) > 5:
                    print(f"  ... and {len(images) - 5} more")
                
                choice = input("\nUse first image? (yes/no): ").strip().lower()
                if choice in ["yes", "y"]:
                    return images[0]
                print("Skipping directory.\n")
            else:
                print(f"No images found in: {p}\n")
                continue
        
        # If it's a file, return it
        if p.is_file():
            return p
        
        print(f"Path not found: {p}\n")


# ============================================================================
# DISPLAY
# ============================================================================
def display_image_insights(image_result):
    print("[📷 IMAGE ANALYSIS]")
    print(f"Prediction: {image_result['condition'].replace('_',' ').title()}")
    print(f"Confidence: {image_result['confidence']:.1%}")

    if image_result.get("low_confidence"):
        print("⚠️ Low confidence")

    if image_result.get("alternatives"):
        print("\nAlternatives:")
        for alt in image_result["alternatives"][:2]:
            print(f" • {alt['class'].replace('_',' ').title()} ({alt['confidence']:.1%})")
    print()


def display_symptom_insights(symptom_result):
    print("[🩺 SYMPTOM ANALYSIS]")
    print(f"Top match: {symptom_result['primary'].replace('_',' ').title()}")
    print(f"Score: {symptom_result['primary_score']}")

    print()


def display_final(combined, image_result, symptom_result):
    print_header("FINAL DIAGNOSIS & RECOMMENDATIONS")

    if not combined:
        print("❌ Unable to generate diagnosis.")
        return

    print("Predicted Conditions (ranked by likelihood):\n")

    for i, (disease, score) in enumerate(combined[:3], 1):
        name = disease.replace("_", " ").title()

        if score > 12:
            level = "🔴 High"
        elif score > 6:
            level = "🟡 Moderate"
        else:
            level = "🟢 Low"

        percent = min(100, int(score * 5))
        bar = "█" * (percent // 10) + "░" * (10 - percent // 10)

        print(f"{i}. {name:<25} [{bar}] {percent}% ({level})")

    # Detailed info on primary diagnosis
    top = combined[0][0]

    if top in DISEASE_INFO:
        info = DISEASE_INFO[top]

        print(f"\n{'─' * 50}")
        print(f"\n📋 About {top.replace('_', ' ').title()}:")
        print(f"{info['desc']}\n")

        print("💊 What to do:")
        print(f"{info['advice']}\n")

    # Show analysis sources
    print("─" * 50)
    print("\nAnalysis Sources:")

    if image_result:
        img_pred = image_result["condition"].replace("_", " ").title()
        img_conf = image_result["confidence"]
        print(f"  • Image analysis: {img_pred} ({img_conf:.0%})")

    if symptom_result:
        sym_pred = symptom_result["primary"].replace("_", " ").title()
        print(f"  • Symptom analysis: {sym_pred}")

    # Highlight mismatches
    if image_result and symptom_result:
        if image_result["condition"] != symptom_result["primary"]:
            print(f"\n  ⚠️ Note: Image and symptom analyses disagree")
            print(f"     Consider consulting a veterinarian for clarification.")

    print("\n" + "=" * 50)
    print("\n⚠️  MEDICAL DISCLAIMER")
    print("=" * 50)
    print("""
This tool is for INFORMATIONAL PURPOSES ONLY.

IT IS NOT A SUBSTITUTE FOR PROFESSIONAL VETERINARY CARE.

Please consult a licensed veterinarian for:
  ✓ Definitive diagnosis
  ✓ Treatment recommendations
  ✓ Emergency situations
  ✓ Any health concerns about your pet

A vet can provide:
  • Physical examination
  • Laboratory tests
  • Professional expertise
  • Appropriate treatment options

ALWAYS prioritize professional veterinary consultation.
""")
    print("=" * 50 + "\n")


# ============================================================================
# MAIN
# ============================================================================
def run_pipeline():
    print_header("AI PET HEALTH ASSISTANT")

    species = get_species()
    print(f"✓ Species: {species.upper()}\n")

    image_result = None
    symptom_result = None
    image_path = None

    # Step 1: Image Analysis (optional)
    if get_yes_no("Analyze an image? (yes/no): "):
        image_path = get_image_path()

        if image_path:
            print("\n⏳ Analyzing image...\n")

            try:
                image_result = predict_disease(species, image_path)

                # Species mismatch check
                try:
                    predicted_species, conf = predict_species(image_path)
                    predicted_species = normalize_species(predicted_species)

                    if predicted_species != species and conf > 0.7:
                        print("\n⚠️ SPECIES MISMATCH DETECTED")
                        print(f"Image model detected: {predicted_species.upper()} ({conf:.1%})")
                        print(f"You selected: {species.upper()}")

                        if get_yes_no("\nSwitch to detected species? (yes/no): "):
                            species = predicted_species
                            print(f"\n✓ Switched to {species.upper()}")
                            print("Re-analyzing with correct species...\n")
                            image_result = predict_disease(species, image_path)

                except Exception as e:
                    pass  # Species detection failed, continue with user choice

                print("✓ Image analysis complete.\n")

            except Exception as e:
                print(f"❌ Error analyzing image: {e}\n")
        else:
            print("Skipping image analysis.\n")

    # Step 2: Symptom Analysis (optional)
    if get_yes_no("Answer symptom questions? (yes/no): "):
        print()

        try:
            checker = HybridSymptomChecker(species)

            print_header("Symptom Questionnaire")
            print("Please answer the following questions about your pet.")
            print("(Type 'yes' or 'no')\n")

            for i in range(8):
                # Stop early if high confidence reached
                if max(checker.scores.values()) >= 8:
                    print("(Sufficient confidence reached - stopping early)\n")
                    break

                q = checker.ask_next()

                if not q:
                    break

                symptom, text = q
                print(f"Q{i + 1}. {text}")

                while True:
                    ans = input("     > ").strip().lower()

                    if ans in ["yes", "no", "y", "n"]:
                        ans_normalized = "yes" if ans in ["yes", "y"] else "no"
                        checker.update_scores(symptom, ans_normalized)
                        print()
                        break

                    print("     Please answer 'yes' or 'no'.")

            symptom_result = checker.get_results()
            print("✓ Symptom analysis complete.\n")

        except Exception as e:
            print(f"❌ Error in symptom analysis: {e}\n")

    # Step 3: Generate final diagnosis
    if not image_result and not symptom_result:
        print("❌ No input provided. Please provide either an image or symptom answers.")
        return

    combined = combine_results(image_result, symptom_result)

    if image_result:
        display_image_insights(image_result)

    if symptom_result:
        display_symptom_insights(symptom_result)

    display_final(combined, image_result, symptom_result)


def main():
    try:
        run_pipeline()
    except KeyboardInterrupt:
        print("\n\n👋 Thank you for using the AI Pet Health Assistant!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        print("Please try again or contact support.")
        sys.exit(1)


if __name__ == "__main__":
    main()