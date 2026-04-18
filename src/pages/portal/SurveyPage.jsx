import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { SURVEY_SECTIONS } from '@/lib/surveyConfig'
import MultiSelectQuestion from '@/components/survey/MultiSelectQuestion'
import SingleSelectQuestion from '@/components/survey/SingleSelectQuestion'
import RankingQuestion from '@/components/survey/RankingQuestion'
import ScaleQuestion from '@/components/survey/ScaleQuestion'
import OpenTextQuestion from '@/components/survey/OpenTextQuestion'
import { ClipboardList, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'

const STORAGE_KEY = 'eo-survey-draft'

const QUESTION_COMPONENTS = {
  multi_select: MultiSelectQuestion,
  single_select: SingleSelectQuestion,
  ranking: RankingQuestion,
  scale: ScaleQuestion,
  open_text: OpenTextQuestion,
}

export default function SurveyPage() {
  const { user, profile } = useAuth()
  const [currentSection, setCurrentSection] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Load saved answers
  useEffect(() => {
    const loadAnswers = async () => {
      // Try Supabase first
      if (isSupabaseConfigured() && user) {
        const { data } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (data) {
          const loaded = {}
          SURVEY_SECTIONS.forEach(section => {
            section.questions.forEach(q => {
              if (data[q.column] != null) loaded[q.id] = data[q.column]
            })
          })
          setAnswers(loaded)
          if (data.current_section) setCurrentSection(data.current_section - 1)
          if (data.is_complete) setSubmitted(true)
        }
      } else {
        // Load from localStorage in dev mode
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            setAnswers(parsed.answers || {})
            if (parsed.currentSection != null) setCurrentSection(parsed.currentSection)
            if (parsed.submitted) setSubmitted(true)
          }
        } catch { /* ignore */ }
      }
      setLoading(false)
    }
    loadAnswers()
  }, [user])

  // Save answers (debounced on section change)
  const saveProgress = useCallback(async (newAnswers, sectionIdx, isComplete = false) => {
    if (isSupabaseConfigured() && user) {
      const row = { user_id: user.id, current_section: sectionIdx + 1, is_complete: isComplete }
      SURVEY_SECTIONS.forEach(section => {
        section.questions.forEach(q => {
          if (newAnswers[q.id] !== undefined) row[q.column] = newAnswers[q.id]
        })
      })
      await supabase.from('survey_responses').upsert(row, { onConflict: 'user_id' })
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        answers: newAnswers,
        currentSection: sectionIdx,
        submitted: isComplete,
      }))
    }
  }, [user])

  const setAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const section = SURVEY_SECTIONS[currentSection]

  const goNext = async () => {
    if (currentSection < SURVEY_SECTIONS.length - 1) {
      const nextIdx = currentSection + 1
      setCurrentSection(nextIdx)
      await saveProgress(answers, nextIdx)
    }
  }

  const goPrev = () => {
    if (currentSection > 0) setCurrentSection(currentSection - 1)
  }

  const handleSubmit = async () => {
    setSaving(true)
    await saveProgress(answers, currentSection, true)

    // Mark survey as complete on profile
    if (isSupabaseConfigured() && user) {
      await supabase.from('profiles').update({ survey_completed_at: new Date().toISOString() }).eq('id', user.id)
    }

    setSubmitted(true)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <Check className="h-8 w-8 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Thank You!</h1>
        <p className="text-white/60 mb-6">
          Your learning preferences have been recorded. The Learning Chair will use this data to design events that match what our members actually want.
        </p>
        <button
          onClick={() => { setSubmitted(false); setCurrentSection(0) }}
          className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
        >
          Review or update your answers →
        </button>
      </div>
    )
  }

  const isLastSection = currentSection === SURVEY_SECTIONS.length - 1
  const progress = ((currentSection + 1) / SURVEY_SECTIONS.length) * 100

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <ClipboardList className="h-5 w-5 text-warm" />
        <h1 className="text-xl font-bold">Learning Preferences Survey</h1>
      </div>
      <p className="text-xs text-white/40 mb-6">Help us design events you'll love. Takes about 5 minutes.</p>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-white/40 mb-2">
          <span>Section {currentSection + 1} of {SURVEY_SECTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Section dots */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {SURVEY_SECTIONS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentSection(idx)}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                idx === currentSection
                  ? 'bg-primary w-6'
                  : idx < currentSection
                    ? 'bg-primary/50'
                    : 'bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Section content */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-lg font-bold">{section.title}</h2>
          <p className="text-sm text-white/50 mt-1">{section.subtitle}</p>
        </div>

        <div className="space-y-8">
          {section.questions.map(question => {
            const Component = QUESTION_COMPONENTS[question.type]
            if (!Component) return null
            return (
              <Component
                key={question.id}
                question={question}
                value={answers[question.id]}
                onChange={(val) => setAnswer(question.id, val)}
              />
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pb-8">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentSection === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            currentSection === 0
              ? 'text-white/20 cursor-not-allowed'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {isLastSection ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Submit Survey
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
