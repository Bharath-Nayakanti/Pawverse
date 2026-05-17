"""
FastAPI Backend for Pawverse Pet Health Assistant
Exposes ML models as REST API endpoints
"""

from pathlib import Path
from typing import Optional, List, Dict, Any
import sys

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from PIL import Image
from torchvision import transforms
import io

# Import ML modules
from predict_disease_unified import predict_disease, load_model, build_model
from predict_species import predict_species as predict_species_func
from predict_full import predict_full
from hybrid_symptom_chatbot import HybridSymptomChecker, DISEASE_INFO

# ============================================================================
# FASTAPI APP SETUP
# ============================================================================
app = FastAPI(
    title="Pawverse Pet Health API",
    description="AI-powered pet health diagnosis API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================
class SpeciesResponse(BaseModel):
    species: str
    confidence: float

class DiseaseResponse(BaseModel):
    species: str
    condition: str
    confidence: float
    description: str
    advice: str
    alternatives: List[Dict[str, Any]]
    low_confidence: bool

class SymptomQuestion(BaseModel):
    symptom_id: str
    question: str

class SymptomAnswer(BaseModel):
    symptom_id: str
    answer: str  # "yes" or "no"

class SymptomResponse(BaseModel):
    species: str
    primary: str
    primary_score: int
    ranked: List[Dict[str, Any]]
    responses: Dict[str, bool]

class CombinedDiagnosis(BaseModel):
    ranked_conditions: List[Dict[str, Any]]
    image_result: Optional[DiseaseResponse]
    symptom_result: Optional[SymptomResponse]

class SymptomStartResponse(BaseModel):
    session_id: str
    first_question: SymptomQuestion
    max_questions: int

class BreedResponse(BaseModel):
    species: str
    species_confidence: float
    breed: str
    breed_confidence: float
    top_breeds: List[Dict[str, Any]]
    similar_breeds: List[str]
    model_metadata: Dict[str, Any]

class FeedingRecommendationRequest(BaseModel):
    species: str
    breed: Optional[str] = None
    age_years: Optional[float] = 1
    weight_kg: Optional[float] = 10
    activity_level: Optional[str] = "moderate"

class VaccineRecommendationRequest(BaseModel):
    species: str
    breed: Optional[str] = None
    age_years: Optional[float] = 1
    region: Optional[str] = "US"

class SymptomAnalysisRequest(BaseModel):
    species: str
    symptoms: List[str]

# ============================================================================
# TRANSFORM
# ============================================================================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# ============================================================================
# SYMPTOM CHECKER SESSIONS
# ============================================================================
symptom_sessions: Dict[str, HybridSymptomChecker] = {}

import uuid

# ============================================================================
# ENDPOINTS
# ============================================================================
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Pawverse Pet Health API",
        "version": "1.0.0",
        "endpoints": {
            "species": "/predict/species",
            "disease": "/predict/disease",
            "symptom_start": "/symptom/start",
            "symptom_answer": "/symptom/answer",
            "symptom_results": "/symptom/results/{session_id}"
        }
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.post("/predict/species", response_model=SpeciesResponse)
async def predict_species(file: UploadFile = File(...)):
    """
    Predict species from uploaded image
    
    Returns: species (dog/cat) and confidence score
    """
    try:
        # Read and process image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Save temp file for predict_species function
        temp_path = Path("temp/temp_species_image.jpg")
        temp_path.parent.mkdir(exist_ok=True)
        image.save(temp_path)
        
        # Predict
        species, confidence = predict_species_func(temp_path)
        
        # Normalize species to singular form
        species = species.lower()
        if species in ["dogs", "dog"]:
            species = "dog"
        elif species in ["cats", "cat"]:
            species = "cat"
        
        # Clean up
        temp_path.unlink()
        
        return SpeciesResponse(species=species, confidence=confidence)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/breed", response_model=BreedResponse)
async def predict_breed(file: UploadFile = File(...)):
    """
    Predict pet species and breed from an uploaded image.

    Returns confidence scores, top alternatives, lightweight metadata, and similar breeds.
    """
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        temp_path = Path("temp/temp_breed_image.jpg")
        temp_path.parent.mkdir(exist_ok=True)
        image.save(temp_path)

        result = predict_full(temp_path)
        temp_path.unlink(missing_ok=True)

        return BreedResponse(
            species=result["animal"].lower(),
            species_confidence=result["animal_confidence"],
            breed=result["breed"],
            breed_confidence=result["breed_confidence"],
            top_breeds=result["top_breeds"],
            similar_breeds=result["similar_breeds"],
            model_metadata={
                "model": "efficientnet_b0",
                "task": "species_and_breed_classification",
                "explainability": "top-k alternatives and similar-breed hints",
                "low_confidence_threshold": 0.60,
            }
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/disease", response_model=DiseaseResponse)
async def predict_disease_endpoint(
    species: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Predict disease from uploaded image for specified species
    
    Args:
        species: "dog" or "cat"
        file: Image file
        
    Returns: Disease prediction with confidence and alternatives
    """
    try:
        species = species.lower()
        if species not in ["dog", "cat"]:
            raise HTTPException(status_code=400, detail="Species must be 'dog' or 'cat'")
        
        # Read and process image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Save temp file for predict_disease function
        temp_path = Path("temp/temp_image.jpg")
        temp_path.parent.mkdir(exist_ok=True)
        image.save(temp_path)
        
        # Predict
        result = predict_disease(species, temp_path)
        
        # Clean up
        temp_path.unlink()
        
        return DiseaseResponse(**result)
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/symptom/start", response_model=SymptomStartResponse)
async def start_symptom_checker(species: str):
    """
    Start a new symptom checker session
    
    Args:
        species: "dog" or "cat"
        
    Returns: Session ID and first question
    """
    try:
        species = species.lower()
        if species not in ["dog", "cat"]:
            raise HTTPException(status_code=400, detail="Species must be 'dog' or 'cat'")
        
        # Create new session
        session_id = str(uuid.uuid4())
        checker = HybridSymptomChecker(species)
        symptom_sessions[session_id] = checker
        
        # Calculate max questions for this species
        from hybrid_symptom_chatbot import SYMPTOM_DATABASE
        species_symptoms = set()
        for disease_data in SYMPTOM_DATABASE[species].values():
            species_symptoms.update(disease_data.keys())
        max_questions = len(species_symptoms)
        
        # Get first question
        question = checker.ask_next()
        if question is None:
            raise HTTPException(status_code=500, detail="No questions available")
        
        symptom_id, question_text = question
        
        return SymptomStartResponse(
            session_id=session_id,
            first_question=SymptomQuestion(
                symptom_id=symptom_id,
                question=question_text
            ),
            max_questions=max_questions
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/symptom/answer")
async def answer_symptom_question(
    session_id: str = None,
    symptom_id: str = None,
    answer: str = None
):
    """
    Submit answer to current symptom question
    
    Args:
        session_id: Session identifier
        symptom_id: Symptom identifier
        answer: "yes" or "no"
        
    Returns: Next question or null if complete
    """
    try:
        print(f"Received answer - session_id: {session_id}, symptom_id: {symptom_id}, answer: {answer}")
        
        if session_id not in symptom_sessions:
            print(f"Session not found: {session_id}")
            print(f"Available sessions: {list(symptom_sessions.keys())}")
            raise HTTPException(status_code=404, detail="Session not found")
        
        answer = answer.lower()
        if answer not in ["yes", "no"]:
            raise HTTPException(status_code=400, detail="Answer must be 'yes' or 'no'")
        
        checker = symptom_sessions[session_id]
        checker.update_scores(symptom_id, answer)
        
        # Get next question
        next_question = checker.ask_next()
        
        if next_question is None:
            return {"next_question": None}
        
        symptom_id, question_text = next_question
        return {"next_question": {"symptom_id": symptom_id, "question": question_text}}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in answer_symptom_question: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/symptom/results/{session_id}", response_model=SymptomResponse)
async def get_symptom_results(session_id: str):
    """
    Get final symptom analysis results
    
    Args:
        session_id: Session identifier
        
    Returns: Ranked disease predictions
    """
    try:
        print(f"Getting results for session: {session_id}")
        print(f"Available sessions: {list(symptom_sessions.keys())}")
        
        if session_id not in symptom_sessions:
            raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
        
        checker = symptom_sessions[session_id]
        
        # Check if checker has results
        if not checker:
            raise HTTPException(status_code=500, detail="Symptom checker not initialized properly")
        
        results = checker.get_results()
        print(f"Results from checker: {results}")
        
        # Validate results structure
        if not results:
            raise HTTPException(status_code=500, detail="No results generated")
        
        # Ensure required fields are present
        required_fields = ['species', 'primary', 'primary_score', 'ranked', 'responses']
        for field in required_fields:
            if field not in results:
                if field == 'ranked':
                    results[field] = []
                elif field == 'responses':
                    results[field] = {}
                elif field == 'primary_score':
                    results[field] = 0
                elif field == 'primary':
                    results[field] = 'unknown'
                elif field == 'species':
                    results[field] = checker.species if hasattr(checker, 'species') else 'unknown'
        
        # Convert ranked tuples to dictionaries
        if 'ranked' in results and results['ranked']:
            results['ranked'] = [
                {"disease": disease, "score": score} 
                for disease, score in results['ranked']
            ]
        
        # Clean up old sessions (optional)
        # del symptom_sessions[session_id]
        
        return SymptomResponse(**results)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_symptom_results: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/symptom/analyze")
async def analyze_symptoms_direct(
    species: str,
    symptoms: Dict[str, str]
):
    """
    Direct symptom analysis (non-session based)
    
    Args:
        species: "dog" or "cat"
        symptoms: Dictionary of symptom_id -> "yes"/"no"
        
    Returns: Ranked disease predictions based on symptoms
    """
    try:
        species = species.lower()
        if species not in ["dog", "cat"]:
            raise HTTPException(status_code=400, detail="Species must be 'dog' or 'cat'")
        
        # Create checker
        checker = HybridSymptomChecker(species)
        
        # Update scores with provided symptoms
        for symptom_id, answer in symptoms.items():
            if isinstance(answer, str):
                answer = answer.lower()
            if answer in ["yes", "no"]:
                checker.update_scores(symptom_id, answer)
        
        # Get results
        results = checker.get_results()
        
        # Format ranked predictions
        ranked_predictions = []
        if results.get('ranked'):
            for disease, score in results['ranked']:
                ranked_predictions.append({
                    "disease": disease,
                    "score": score
                })
        
        return {
            "status": "success",
            "data": {
                "species": species,
                "primary_diagnosis": results.get('primary'),
                "primary_score": results.get('primary_score', 0),
                "ranked_predictions": ranked_predictions,
                "responses": results.get('responses', {})
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Error in analyze_symptoms_direct: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/symptom/analyze-advanced")
async def analyze_symptoms_advanced(payload: SymptomAnalysisRequest):
    emergency_terms = ["collapse", "seizure", "trouble breathing", "poison", "bleeding", "unconscious"]
    high_terms = ["vomiting", "lethargy", "blood", "pain", "not eating"]
    moderate_terms = ["itching", "limping", "cough", "diarrhea"]
    symptoms = [symptom.lower() for symptom in payload.symptoms]

    emergency_hits = [symptom for symptom in symptoms if any(term in symptom for term in emergency_terms)]
    high_hits = [symptom for symptom in symptoms if any(term in symptom for term in high_terms)]
    moderate_hits = [symptom for symptom in symptoms if any(term in symptom for term in moderate_terms)]
    urgency_score = min(100, len(emergency_hits) * 45 + len(high_hits) * 25 + len(moderate_hits) * 15 + len(symptoms) * 5)
    severity = "emergency" if urgency_score >= 75 else "high" if urgency_score >= 45 else "moderate" if urgency_score >= 25 else "low"

    recommendation = {
        "emergency": "Seek emergency veterinary care immediately.",
        "high": "Visit a veterinarian within 24 hours.",
        "moderate": "Monitor closely and schedule a vet visit if symptoms persist.",
        "low": "Track symptoms and continue routine care."
    }[severity]

    return {
        "species": payload.species,
        "symptoms": payload.symptoms,
        "urgency_score": urgency_score,
        "severity": severity,
        "confidence": 0.82 if len(symptoms) >= 2 else 0.62,
        "emergency_detected": severity == "emergency",
        "recommendation": recommendation,
        "explainability": {
            "emergency_matches": emergency_hits,
            "high_risk_matches": high_hits,
            "moderate_matches": moderate_hits
        }
    }

@app.post("/feeding/recommend")
async def recommend_feeding(payload: FeedingRecommendationRequest):
    weight = max(payload.weight_kg or 10, 1)
    activity_multiplier = {"low": 1.2, "moderate": 1.6, "high": 2.0}.get(payload.activity_level or "moderate", 1.6)
    rer = 70 * (weight ** 0.75)
    calories = round(rer * activity_multiplier)
    meals = 3 if (payload.age_years or 1) < 1 else 2

    return {
        "calories_per_day": calories,
        "meals_per_day": meals,
        "quantity_per_meal": f"{round(calories / meals)} kcal per meal",
        "hydration_goal_ml": round(weight * 55),
        "feeding_times": ["07:30", "13:00", "19:00"] if meals == 3 else ["08:00", "19:00"],
        "food_suggestions": [
            "Complete and balanced life-stage food",
            "Prioritize high-quality animal protein",
            "Keep treats under 10% of daily calories"
        ],
        "confidence": 0.82,
        "model_metadata": {
            "method": "resting_energy_requirement_x_activity_factor",
            "explainability": "calories derived from weight and activity level"
        }
    }

@app.post("/vaccines/recommend")
async def recommend_vaccines(payload: VaccineRecommendationRequest):
    species = payload.species.lower()
    catalog = {
        "dog": ["DHPP", "Rabies", "Parvo", "Bordetella"],
        "cat": ["FVRCP", "Rabies", "FeLV"]
    }.get(species, ["Rabies"])
    age_years = payload.age_years or 1
    status = "overdue" if age_years > 1 else "suggested"

    return {
        "species": species,
        "region": payload.region,
        "recommendations": [
            {
                "vaccine_name": name,
                "status": status,
                "confidence": 0.88,
                "explainability": f"{name} is commonly recommended for {species}s based on age and region."
            }
            for name in catalog
        ],
        "model_metadata": {
            "method": "rules_based_species_age_region_schedule",
            "version": "1.0.0"
        }
    }

@app.post("/diagnosis/combine")

async def combine_diagnosis(
    image_result: Optional[DiseaseResponse] = None,
    symptom_result: Optional[SymptomResponse] = None
):
    """
    Combine image and symptom results for final diagnosis
    
    Args:
        image_result: Optional image analysis result
        symptom_result: Optional symptom analysis result
        
    Returns: Combined ranked diagnosis
    """
    try:
        combined_scores = {}
        
        # Image scores (0–10 scale)
        if image_result:
            condition = image_result.condition
            confidence = image_result.confidence
            combined_scores[condition] = confidence * 10
            
            for alt in image_result.alternatives:
                alt_class = alt["class"]
                alt_score = alt["confidence"] * 5
                combined_scores[alt_class] = combined_scores.get(alt_class, 0) + alt_score
        
        # Normalized symptom scores (0–10 scale)
        if symptom_result:
            ranked = symptom_result.ranked
            if ranked:
                max_score = max(item["score"] for item in ranked) or 1
                
                for item in ranked:
                    disease = item["disease"]
                    score = item["score"]
                    normalized = (score / max_score) * 10
                    combined_scores[disease] = combined_scores.get(disease, 0) + normalized
        
        # Sort and format
        sorted_results = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        
        formatted_results = []
        for disease, score in sorted_results:
            # Calculate percentage and level
            percent = min(100, int(score * 5))
            if score > 12:
                level = "High"
            elif score > 6:
                level = "Moderate"
            else:
                level = "Low"
            
            formatted_results.append({
                "disease": disease,
                "score": score,
                "percent": percent,
                "level": level
            })
        
        return {
            "ranked_conditions": formatted_results,
            "image_result": image_result,
            "symptom_result": symptom_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# RUN
# ============================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
