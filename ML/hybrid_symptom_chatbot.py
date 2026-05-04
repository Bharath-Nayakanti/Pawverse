"""
Hybrid Symptom Chatbot for Pet Disease Detection

This tool asks questions about pet symptoms to help identify potential diseases.
Can be combined with image-based predictions for better accuracy.
"""

from pathlib import Path
import sys

# Shared disease information (from trained models)
DISEASE_INFO = {
    "healthy": {
        "desc": "No visible signs of disease.",
        "advice": "Maintain regular hygiene and veterinary checkups.",
    },
    "fungal_infection": {
        "desc": (
            "Fungal infections like ringworm can cause circular patches, "
            "redness, scaling, or hair loss."
        ),
        "advice": "Keep the area clean and dry. Consult a vet for antifungal treatment.",
    },
    "parasite_infection": {
        "desc": (
            "Caused by parasites like mites, fleas, or ticks. Symptoms include "
            "itching, hair loss, and skin irritation."
        ),
        "advice": "Use vet-recommended anti-parasitic treatment.",
    },
    "allergy": {
        "desc": (
            "Allergic reactions to food, environment, or fleas causing itching "
            "and redness."
        ),
        "advice": "Identify triggers and consult a veterinarian.",
    },
    "skin_inflammation": {
        "desc": (
            "Skin irritation or dermatitis, often due to infection or allergies."
        ),
        "advice": "Keep skin clean and consult a vet.",
    },
}

# Symptom database (species-aware)
SYMPTOM_DATABASE = {
    "dog": {
        "fungal_infection": {
            "circular_patches": 4,
            "hair_loss": 3,
            "scaly_skin": 3,
            "redness": 2,
            "odor": 2,
        },
        "parasite_infection": {
            "itching": 4,
            "fleas": 4,
            "red_bumps": 3,
            "hair_loss": 2,
            "scabs": 2,
        },
        "allergy": {
            "itching": 3,
            "redness": 3,
            "swelling": 2,
            "scratching": 2,
        },
        "skin_inflammation": {
            "redness": 3,
            "rash": 3,
            "irritation": 2,
            "warmth": 2,
        },
    },
    "cat": {
        "fungal_infection": {
            "circular_patches": 4,
            "hair_loss": 3,
            "scaly_skin": 3,
            "scabs": 2,
        },
        "parasite_infection": {
            "itching": 4,
            "fleas": 4,
            "scabies": 3,
            "hair_loss": 2,
        },
        "allergy": {
            "itching": 3,
            "redness": 2,
            "swelling": 2,
        },
    },
}

# Symptom questions
SYMPTOM_QUESTIONS = {
    "itching": "Is your pet itching or scratching a lot?",
    "fleas": "Do you see fleas, ticks, or flea dirt?",
    "hair_loss": "Is there noticeable hair loss or bald patches?",
    "circular_patches": "Are there circular or ring-shaped patches on the skin?",
    "scaly_skin": "Is the skin dry, scaly, or flaky?",
    "red_bumps": "Are there red bumps or pustules?",
    "redness": "Is there redness or inflammation?",
    "swelling": "Do you see swelling or puffiness?",
    "rash": "Is there a visible rash?",
    "irritation": "Does the skin look irritated or raw?",
    "scabies": "Do you see crusty or thick skin patches (scabies)?",
    "odor": "Does the affected area have a strong odor?",
    "scabs": "Are there scabs or wounds?",
    "scratching": "Is your pet excessively scratching?",
    "warmth": "Is the affected area warm to touch?",
}


# ============================================================================
# SYMPTOM CHECKER ENGINE
# ============================================================================
class HybridSymptomChecker:
    """
    Symptom-based disease checker for pets.
    
    Uses a scoring system to identify likely diseases based on symptoms.
    """

    def __init__(self, species):
        """
        Initialize checker for a species.
        
        Args:
            species: "dog" or "cat"
            
        Raises:
            ValueError: If species not recognized
        """
        species = species.lower()

        if species not in SYMPTOM_DATABASE:
            raise ValueError(f"Species must be 'dog' or 'cat', got '{species}'")

        self.species = species
        self.symptom_rules = SYMPTOM_DATABASE[species]
        self.scores = {disease: 0 for disease in self.symptom_rules}
        self.asked_symptoms = set()
        self.responses = {}

    def update_scores(self, symptom, answer):
        """
        Update disease scores based on symptom answer.
        
        Args:
            symptom: Symptom identifier
            answer: "yes" or "no"
        """
        if answer.lower() == "yes":
            for disease, symptoms in self.symptom_rules.items():
                if symptom in symptoms:
                    self.scores[disease] += symptoms[symptom]

        self.responses[symptom] = answer.lower() == "yes"

    def get_available_symptoms(self):
        """Get symptoms not yet asked."""
        all_symptoms = set()
        for disease_symptoms in self.symptom_rules.values():
            all_symptoms.update(disease_symptoms.keys())

        return [s for s in all_symptoms if s not in self.asked_symptoms]

    def get_best_symptom(self):
        """
        Select the most informative symptom to ask next.
        
        Prioritizes symptoms that differentiate between top diseases.
        """
        available = self.get_available_symptoms()

        if not available:
            return None

        # Get top diseases by current score
        sorted_diseases = sorted(
            self.scores.items(), key=lambda x: x[1], reverse=True
        )
        top_diseases = [d[0] for d in sorted_diseases[:3] if d[1] > 0]

        if not top_diseases:
            # No strong candidates yet, ask any symptom
            return available[0]

        # Find symptom that appears in some but not all top diseases
        best_symptom = None
        best_score = -1

        for symptom in available:
            appears_in = sum(
                symptom in self.symptom_rules[d] for d in top_diseases
            )

            # Prefer symptoms that differentiate
            if 0 < appears_in < len(top_diseases):
                symptom_importance = sum(
                    self.symptom_rules[d].get(symptom, 0) for d in top_diseases
                )
                if symptom_importance > best_score:
                    best_score = symptom_importance
                    best_symptom = symptom

        # Fallback to first available if no differentiator found
        return best_symptom or available[0]

    def ask_next(self):
        """
        Get the next symptom question to ask.
        
        Returns:
            Tuple of (symptom_id, question_text) or None if no more questions
        """
        symptom = self.get_best_symptom()

        if symptom is None:
            return None

        self.asked_symptoms.add(symptom)
        return symptom, SYMPTOM_QUESTIONS[symptom]

    def get_results(self):
        """
        Get ranked disease predictions based on current scores.
        
        Returns:
            Dictionary with ranked disease predictions
        """
        sorted_scores = sorted(
            self.scores.items(), key=lambda x: x[1], reverse=True
        )

        return {
            "species": self.species,
            "primary": sorted_scores[0][0],
            "primary_score": sorted_scores[0][1],
            "ranked": sorted_scores,
            "responses": self.responses,
        }

    def get_recommendation(self):
        """Get health recommendation based on results."""
        results = self.get_results()
        primary = results["primary"]

        # Low score means inconclusive
        if results["primary_score"] < 3:
            return "Inconclusive. Please consult a veterinarian for proper diagnosis."

        return DISEASE_INFO[primary]["advice"]


# ============================================================================
# CLI INTERFACE
# ============================================================================
def print_header(text):
    """Print formatted header."""
    print(f"\n{'=' * 50}")
    print(f"  {text.upper()}")
    print(f"{'=' * 50}\n")


def print_results(results):
    """Display prediction results nicely."""
    print_header("Symptom Analysis Results")

    print(f"Species: {results['species'].upper()}\n")

    print("Disease Predictions (ranked by score):")
    for i, (disease, score) in enumerate(results["ranked"], 1):
        confidence = "●" * min(score, 5)
        print(f"  {i}. {disease.replace('_', ' ').title():<25} [{confidence}] ({score})")

    print(f"\n▶ Primary diagnosis: {results['primary'].replace('_', ' ').title()}")

    # Show disease info
    disease = results["primary"]
    if disease in DISEASE_INFO:
        info = DISEASE_INFO[disease]
        print(f"\nWhat it means:")
        print(f"  {info['desc']}\n")
        print(f"Recommendation:")
        print(f"  {info['advice']}\n")


def print_usage():
    """Print usage information."""
    print("""
Usage:
  python hybrid_symptom_chatbot.py [species]

Arguments:
  species   Optional: 'dog' or 'cat'
            If omitted, you will be prompted

Examples:
  python hybrid_symptom_chatbot.py
  python hybrid_symptom_chatbot.py dog
  python hybrid_symptom_chatbot.py cat
""")


def get_species_input():
    """Prompt user for pet species."""
    while True:
        species = input("Enter pet species (dog/cat): ").strip().lower()
        if species in ["dog", "cat"]:
            return species
        print("Please enter 'dog' or 'cat'.")


def run_chatbot(species=None):
    """
    Run interactive symptom checker chatbot.
    
    Args:
        species: Optional species ('dog' or 'cat')
    """
    # Get species
    if species is None:
        species = get_species_input()
    else:
        species = species.lower()
        if species not in ["dog", "cat"]:
            print(f"Error: Invalid species '{species}'. Must be 'dog' or 'cat'.")
            sys.exit(1)

    try:
        checker = HybridSymptomChecker(species)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    print_header(f"Symptom Checker - {species.upper()}")
    print("Please answer the following questions about your pet's symptoms.")
    print("(Answer 'yes' or 'no' to each question)\n")

    # Ask up to 8 questions
    max_questions = 8
    question_count = 0

    while question_count < max_questions:
        question = checker.ask_next()

        if question is None:
            break

        symptom, text = question
        print(f"Q{question_count + 1}. {text}")

        while True:
            answer = input("    ").strip().lower()
            if answer in ["yes", "no", "y", "n"]:
                answer = "yes" if answer in ["yes", "y"] else "no"
                checker.update_scores(symptom, answer)
                print()
                break
            print("    Please answer 'yes' or 'no'.")

        question_count += 1

    # Display results
    results = checker.get_results()
    print_results(results)


def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        if sys.argv[1] in ["-h", "--help"]:
            print_usage()
            sys.exit(0)
        run_chatbot(sys.argv[1])
    else:
        run_chatbot()


if __name__ == "__main__":
    main()
