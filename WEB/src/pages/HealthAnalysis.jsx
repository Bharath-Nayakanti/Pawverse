import { useRef, useState } from 'react'
import { Stethoscope, Upload, AlertCircle, CheckCircle, XCircle, PawPrint } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth/useAuth'
import PageNavigation from '../components/PageNavigation'
import { recordAnalysisComplete } from '../utils/analysisStats'
import './HealthAnalysis.css'

function HealthAnalysis() {
  const { user } = useAuth()
  const analysisRecordedRef = useRef(false)
  const [step, setStep] = useState('species') // species, image, symptom, results
  const [species, setSpecies] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Image analysis results
  const [imageResult, setImageResult] = useState(null)
  const [speciesMismatch, setSpeciesMismatch] = useState(null)
  
  // Symptom checker
  const [symptomSessionId, setSymptomSessionId] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [questionCount, setQuestionCount] = useState(0)
  const [maxQuestions, setMaxQuestions] = useState(8)
  const [symptomAnswers, setSymptomAnswers] = useState({})
  const [symptomResult, setSymptomResult] = useState(null)
  
  // Final diagnosis
  const [finalDiagnosis, setFinalDiagnosis] = useState(null)

  const diseaseInfo = {
    healthy: {
      desc: "No visible signs of disease.",
      advice: "Maintain regular hygiene and veterinary checkups.",
    },
    fungal_infection: {
      desc: "Fungal infections like ringworm can cause circular patches, redness, scaling, or hair loss.",
      advice: "Keep the area clean and dry. Consult a vet for antifungal treatment.",
    },
    parasite_infection: {
      desc: "Caused by parasites like mites, fleas, or ticks. Symptoms include itching, hair loss, and skin irritation.",
      advice: "Use vet-recommended anti-parasitic treatment.",
    },
    allergy: {
      desc: "Allergic reaction to food, environment, or fleas causing itching and redness.",
      advice: "Identify triggers and consult a veterinarian.",
    },
    skin_inflammation: {
      desc: "Skin irritation or dermatitis, often due to infection or allergies.",
      advice: "Keep skin clean and consult a vet.",
    },
  }

  const symptomRules = {
    dog: {
      fungal_infection: {
        circular_patches: 4,
        hair_loss: 3,
        scaly_skin: 3,
        redness: 2,
        odor: 2,
      },
      parasite_infection: {
        itching: 4,
        fleas: 4,
        red_bumps: 3,
        hair_loss: 2,
        scabs: 2,
      },
      allergy: {
        itching: 3,
        redness: 3,
        swelling: 2,
        scratching: 2,
      },
      skin_inflammation: {
        redness: 3,
        rash: 3,
        irritation: 2,
        warmth: 2,
      },
    },
    cat: {
      fungal_infection: {
        circular_patches: 4,
        hair_loss: 3,
        scaly_skin: 3,
        scabs: 2,
      },
      parasite_infection: {
        itching: 4,
        fleas: 4,
        scabies: 3,
        hair_loss: 2,
      },
      allergy: {
        itching: 3,
        redness: 2,
        swelling: 2,
      },
    },
  }

  const withTimeout = (promise, timeoutMs, label) => {
    let timeoutId
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)
    })

    return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId))
  }

  const handleSpeciesSelect = (selectedSpecies) => {
    setSpecies(selectedSpecies)
    setStep('image')
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAnalyzeImage = async () => {
    if (!imageFile || !species) return
    
    setLoading(true)
    setError(null)
    
    try {
      // First check species
      const speciesResult = await api.predictSpecies(imageFile)
      const detectedSpecies = speciesResult.species.toLowerCase()
      
      if (detectedSpecies !== species && speciesResult.confidence > 0.7) {
        setSpeciesMismatch({
          detected: detectedSpecies,
          confidence: speciesResult.confidence,
          selected: species
        })
        setLoading(false)
        return
      }
      
      // Predict disease
      const diseaseResult = await api.predictDisease(imageFile, species)
      setImageResult(diseaseResult)
      setStep('symptom')
      
    } catch {
      setError('Failed to analyze image. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchSpecies = async () => {
    if (!speciesMismatch) return
    
    const newSpecies = speciesMismatch.detected
    setSpecies(newSpecies)
    setSpeciesMismatch(null)
    setLoading(true)
    
    try {
      const diseaseResult = await api.predictDisease(imageFile, newSpecies)
      setImageResult(diseaseResult)
      setStep('symptom')
    } catch {
      setError('Failed to analyze image. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipImage = () => {
    setStep('symptom')
  }

  const handleSkipSymptoms = async () => {
    // Skip symptom analysis and go directly to results
    await generateFinalDiagnosis()
  }

  const buildDiagnosisFromImage = (result) => ({
    ranked_conditions: [{
      disease: result.condition,
      percent: Math.round(result.confidence * 100),
      level: result.confidence > 0.7 ? 'High' : result.confidence > 0.5 ? 'Moderate' : 'Low'
    }]
  })

  const buildDiagnosisFromSymptoms = (result) => {
    const ranked = result.ranked?.length
      ? result.ranked
      : [{ disease: result.primary, score: result.primary_score }]
    const maxScore = Math.max(...ranked.map((item) => item.score), 1)

    return {
      ranked_conditions: ranked.map((item) => {
        const percent = Math.min(95, Math.max(20, Math.round((item.score / maxScore) * 95)))
        let level = 'Low'
        if (item.score >= 7) {
          level = 'High'
        } else if (item.score >= 4) {
          level = 'Moderate'
        }

        return {
          disease: item.disease,
          percent,
          level
        }
      })
    }
  }

  const buildSymptomResultFromAnswers = (answers) => {
    const rules = symptomRules[species] || {}
    const scores = Object.fromEntries(Object.keys(rules).map((disease) => [disease, 0]))

    Object.entries(answers).forEach(([symptomId, answer]) => {
      if (!answer) return

      Object.entries(rules).forEach(([disease, diseaseSymptoms]) => {
        if (symptomId in diseaseSymptoms) {
          scores[disease] += diseaseSymptoms[symptomId]
        }
      })
    })

    const ranked = Object.entries(scores)
      .map(([disease, score]) => ({ disease, score }))
      .sort((a, b) => b.score - a.score)
    const primary = ranked[0] || { disease: 'healthy', score: 0 }

    return {
      species,
      primary: primary.disease,
      primary_score: primary.score,
      ranked,
      responses: answers
    }
  }

  const buildLocalCombinedDiagnosis = (imageData, symptomData) => {
    const scores = new Map()

    if (imageData) {
      scores.set(imageData.condition, (scores.get(imageData.condition) || 0) + imageData.confidence * 10)
      imageData.alternatives?.forEach((alternative) => {
        scores.set(
          alternative.class,
          (scores.get(alternative.class) || 0) + alternative.confidence * 5
        )
      })
    }

    if (symptomData) {
      const ranked = symptomData.ranked?.length
        ? symptomData.ranked
        : [{ disease: symptomData.primary, score: symptomData.primary_score }]
      const maxScore = Math.max(...ranked.map((item) => item.score), 1)

      ranked.forEach((item) => {
        scores.set(
          item.disease,
          (scores.get(item.disease) || 0) + (item.score / maxScore) * 10
        )
      })
    }

    return {
      ranked_conditions: Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([disease, score]) => ({
          disease,
          percent: Math.min(100, Math.max(1, Math.round(score * 5))),
          level: score > 12 ? 'High' : score > 6 ? 'Moderate' : 'Low'
        }))
    }
  }

  const generateFinalDiagnosis = async (symptomData = null) => {
    // Use passed symptom data or fall back to state
    const currentSymptomResult = symptomData || symptomResult
    setLoading(true)
    setError(null)
    
    try {
      // If we have both image and symptom results, combine them
      if (imageResult && currentSymptomResult) {
        try {
          const combined = await withTimeout(
            api.combineDiagnosis(imageResult, currentSymptomResult),
            8000,
            'Diagnosis combine'
          )
          setFinalDiagnosis(combined)
        } catch (err) {
          console.warn('Server-side diagnosis combine failed, using local fallback:', err)
          setFinalDiagnosis(buildLocalCombinedDiagnosis(imageResult, currentSymptomResult))
        }
      } else if (imageResult) {
        // Only image result available
        setFinalDiagnosis(buildDiagnosisFromImage(imageResult))
      } else if (currentSymptomResult) {
        // Only symptom result available
        setFinalDiagnosis(buildDiagnosisFromSymptoms(currentSymptomResult))
      } else {
        // No results - show healthy/default state
        setFinalDiagnosis({
          ranked_conditions: [{
            disease: 'healthy',
            percent: 100,
            level: 'Low'
          }]
        })
      }
      
      if (!analysisRecordedRef.current) {
        recordAnalysisComplete(user, species)
        analysisRecordedRef.current = true
      }

      setStep('results')
    } catch (err) {
      console.error('Error generating final diagnosis:', err)
      setError('Failed to generate final diagnosis. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartSymptomChecker = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await api.startSymptomChecker(species)
      setSymptomSessionId(result.session_id)
      setCurrentQuestion(result.first_question)
      setMaxQuestions(result.max_questions)
      setQuestionCount(1)
      setStep('symptom')
    } catch {
      setError('Failed to start symptom checker. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSymptomAnswer = async (answer) => {
    if (!symptomSessionId || !currentQuestion) return
    const symptomId = currentQuestion.symptom_id
    const nextAnswers = {
      ...symptomAnswers,
      [symptomId]: answer === 'yes'
    }
    
    console.log('Submitting answer:', {
      sessionId: symptomSessionId,
      symptomId: symptomId,
      answer: answer
    })
    
    setLoading(true)
    setError(null)
    setSymptomAnswers(nextAnswers)
    
    try {
      const response = await withTimeout(
        api.answerSymptomQuestion(
          symptomSessionId,
          symptomId,
          answer
        ),
        15000,
        'Symptom answer'
      )
      
      console.log('Response received:', response)
      
      // The backend returns {next_question: null} when done
      if (!response.next_question) {
        // No more questions - get final results
        console.log("No more questions, fetching results...");
        setCurrentQuestion(null);
        let results
        try {
          results = await withTimeout(
            api.getSymptomResults(symptomSessionId),
            10000,
            'Symptom results'
          );
        } catch (err) {
          console.warn('Symptom results request failed, using local answers:', err)
          results = buildSymptomResultFromAnswers(nextAnswers)
        }
        setSymptomResult(results);
        await generateFinalDiagnosis(results);
      } else {
        // There are more questions
        setCurrentQuestion(response.next_question);
        setQuestionCount(prev => prev + 1);
      }
      
    } catch (err) {
      console.error("Error submitting answer:", err);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setLoading(false);
    }
}

  const resetAnalysis = () => {
    setStep('species')
    setSpecies('')
    setImageFile(null)
    setImagePreview(null)
    setImageResult(null)
    setSpeciesMismatch(null)
    setSymptomSessionId(null)
    setCurrentQuestion(null)
    setQuestionCount(0)
    setMaxQuestions(8)
    setSymptomResult(null)
    setSymptomAnswers({})
    setFinalDiagnosis(null)
    setError(null)
    analysisRecordedRef.current = false
  }

  const formatDiseaseName = (name) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getConfidenceBar = (percent) => {
    const filled = Math.floor(percent / 10)
    return '█'.repeat(filled) + '░'.repeat(10 - filled)
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'High': return '#ef4444'
      case 'Moderate': return '#f59e0b'
      case 'Low': return '#22c55e'
      default: return '#6b7280'
    }
  }

  return (
    <div className="health-analysis">
      <div className="container">
        <PageNavigation className="health-navigation" />

        <h1 className="page-title">
          <Stethoscope className="icon" />
          Pet Health Analysis
        </h1>

        {error && (
          <div className="error-message">
            <AlertCircle className="icon" />
            {error}
          </div>
        )}

        {/* Step 1: Species Selection */}
        {step === 'species' && (
          <div className="step-card">
            <h2>Step 1: Select Pet Species</h2>
            <p className="step-description">Is your pet a dog or a cat?</p>
            
            <div className="species-buttons">
              <button
                className={`species-btn ${species === 'dog' ? 'active' : ''}`}
                onClick={() => handleSpeciesSelect('dog')}
              >
                <PawPrint className="icon" />
                Dog
              </button>
              <button
                className={`species-btn ${species === 'cat' ? 'active' : ''}`}
                onClick={() => handleSpeciesSelect('cat')}
              >
                <PawPrint className="icon" />
                Cat
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Image Analysis */}
        {step === 'image' && (
          <div className="step-card">
            <h2>Step 2: Image Analysis</h2>
            <p className="step-description">
              Upload an image of your pet for AI-powered disease detection
            </p>

            <div className="image-upload-section">
              <div className="upload-area">
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button
                      className="remove-image-btn"
                      onClick={() => {
                        setImageFile(null)
                        setImagePreview(null)
                      }}
                    >
                      <XCircle className="icon" />
                    </button>
                  </div>
                ) : (
                  <label className="upload-label">
                    <Upload className="icon" />
                    <span>Click to upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden-input"
                    />
                  </label>
                )}
              </div>

              <div className="action-buttons">
                <button
                  className="btn btn-primary"
                  onClick={handleAnalyzeImage}
                  disabled={!imageFile || loading}
                >
                  {loading ? 'Analyzing...' : 'Analyze Image'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleSkipImage}
                  disabled={loading}
                >
                  Skip Image Analysis
                </button>
              </div>
            </div>

            {/* Species Mismatch Warning */}
            {speciesMismatch && (
              <div className="warning-box">
                <AlertCircle className="icon" />
                <div>
                  <h3>⚠️ Species Mismatch Detected</h3>
                  <p>
                    Image model detected: <strong>{speciesMismatch.detected.toUpperCase()}</strong> ({(speciesMismatch.confidence * 100).toFixed(1)}%)
                  </p>
                  <p>
                    You selected: <strong>{speciesMismatch.selected.toUpperCase()}</strong>
                  </p>
                  <button
                    className="btn btn-warning"
                    onClick={handleSwitchSpecies}
                  >
                    Switch to Detected Species
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSpeciesMismatch(null)}
                  >
                    Keep Original Selection
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Symptom Checker */}
        {step === 'symptom' && (
          <div className="step-card">
            <h2>Step 3: Symptom Questionnaire</h2>
            <p className="step-description">
              Answer questions about your pet's symptoms (Question {Math.min(questionCount, maxQuestions)}/{maxQuestions})
            </p>

            {currentQuestion ? (
              <div className="symptom-question">
                <div className="question-box">
                  <h3>{currentQuestion.question}</h3>
                </div>
                <div className="answer-buttons">
                  <button
                    className="btn btn-yes"
                    onClick={() => handleSymptomAnswer('yes')}
                    disabled={loading}
                  >
                    <CheckCircle className="icon" />
                    Yes
                  </button>
                  <button
                    className="btn btn-no"
                    onClick={() => handleSymptomAnswer('no')}
                    disabled={loading}
                  >
                    <XCircle className="icon" />
                    No
                  </button>
                </div>
              </div>
            ) : (
              <div className="action-buttons">
                <button
                  className="btn btn-primary"
                  onClick={handleStartSymptomChecker}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Start Symptom Checker'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleSkipSymptoms}
                  disabled={loading}
                >
                  Skip Symptom Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Results */}
        {step === 'results' && finalDiagnosis && (
          <div className="results-card">
            <h2>Final Diagnosis & Recommendations</h2>

            {/* Image Analysis Result */}
            {imageResult && (
              <div className="result-section">
                <h3>📷 Image Analysis</h3>
                <div className="result-item">
                  <span className="label">Prediction:</span>
                  <span className="value">{formatDiseaseName(imageResult.condition)}</span>
                </div>
                <div className="result-item">
                  <span className="label">Confidence:</span>
                  <span className="value">{(imageResult.confidence * 100).toFixed(1)}%</span>
                </div>
                {imageResult.alternatives && imageResult.alternatives.length > 0 && (
                  <div className="alternatives">
                    <span className="label">Alternatives:</span>
                    {imageResult.alternatives.map((alt, idx) => (
                      <div key={idx} className="alternative">
                        {formatDiseaseName(alt.class)} ({(alt.confidence * 100).toFixed(1)}%)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Symptom Analysis Result */}
            {symptomResult && (
              <div className="result-section">
                <h3>🩺 Symptom Analysis</h3>
                <div className="result-item">
                  <span className="label">Top Match:</span>
                  <span className="value">{formatDiseaseName(symptomResult.primary)}</span>
                </div>
                <div className="result-item">
                  <span className="label">Score:</span>
                  <span className="value">{symptomResult.primary_score}</span>
                </div>
              </div>
            )}

            {/* Combined Diagnosis */}
            <div className="combined-diagnosis">
              <h3>Predicted Conditions (Ranked by Likelihood)</h3>
              {finalDiagnosis.ranked_conditions.map((item, idx) => (
                <div key={idx} className="condition-item">
                  <div className="condition-header">
                    <span className="condition-rank">{idx + 1}.</span>
                    <span className="condition-name">{formatDiseaseName(item.disease)}</span>
                    <span className="condition-percent">{item.percent}%</span>
                  </div>
                  <div className="confidence-bar">
                    <div className="bar-fill" style={{ width: `${item.percent}%` }}></div>
                  </div>
                  <div className="condition-meta">
                    <span className="confidence-text">{getConfidenceBar(item.percent)}</span>
                    <span
                      className="level-badge"
                      style={{ backgroundColor: getLevelColor(item.level) }}
                    >
                      {item.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Disease Info */}
            {finalDiagnosis.ranked_conditions.length > 0 && (
              <div className="disease-info">
                <h3>
                  📋 About {formatDiseaseName(finalDiagnosis.ranked_conditions[0].disease)}
                </h3>
                <p className="disease-desc">
                  {diseaseInfo[finalDiagnosis.ranked_conditions[0].disease]?.desc || 'No description available.'}
                </p>
                <h4>💊 What to do:</h4>
                <p className="disease-advice">
                  {diseaseInfo[finalDiagnosis.ranked_conditions[0].disease]?.advice || 'Consult a veterinarian.'}
                </p>
              </div>
            )}

            {/* Analysis Sources */}
            <div className="analysis-sources">
              <h3>Analysis Sources:</h3>
              {imageResult && (
                <p>• Image analysis: {formatDiseaseName(imageResult.condition)} ({(imageResult.confidence * 100).toFixed(0)}%)</p>
              )}
              {symptomResult && (
                <p>• Symptom analysis: {formatDiseaseName(symptomResult.primary)}</p>
              )}
              {imageResult && symptomResult && imageResult.condition !== symptomResult.primary && (
                <p className="mismatch-note">
                  ⚠️ Note: Image and symptom analyses disagree. Consider consulting a veterinarian.
                </p>
              )}
            </div>

            {/* Disclaimer */}
            <div className="disclaimer-box">
              <h3>⚠️ Medical Disclaimer</h3>
              <p>
                This tool is for INFORMATIONAL PURPOSES ONLY. IT IS NOT A SUBSTITUTE FOR PROFESSIONAL VETERINARY CARE.
              </p>
              <p>
                Please consult a licensed veterinarian for definitive diagnosis, treatment recommendations, emergency situations, and any health concerns about your pet.
              </p>
            </div>

            <button className="btn btn-primary" onClick={resetAnalysis}>
              Start New Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default HealthAnalysis
