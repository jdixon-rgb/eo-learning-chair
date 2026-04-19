import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useChapter } from '@/lib/chapter'
import { SURVEY_SECTIONS } from '@/lib/surveyConfig'
import { ClipboardList, BarChart3, User, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Mock survey responses for dev mode
const MOCK_RESPONSES = [
  {
    user_id: '2',
    profiles: { full_name: 'Sarah Martinez', email: 'sarah@eoarizona.com' },
    energy_formats: ['Keynote with Q&A', 'Small-group workshop (hands-on)', 'Dinner with a speaker'],
    energy_ranking: ['Quality of the speaker / content', 'Practical takeaways I can use immediately', 'Networking time with other members', 'Venue & atmosphere', 'Food & beverage experience'],
    energy_time: '2 hours (keynote + networking)',
    growth_topics: ['Leadership & management', 'Technology & AI', 'Mindset & performance'],
    growth_stage: 'Growth mode — scaling fast',
    growth_challenge: 'Finding and keeping great people',
    growth_stretch: 4,
    joy_social: ['Deep conversations with a few people', 'Shared meals with intentional seating'],
    joy_venue: 'Unique / unconventional space (brewery, ranch, rooftop)',
    joy_speakers: ['Fellow entrepreneur with a great story', 'Subject matter expert (deep knowledge)'],
    perspective_style: ['Listening to stories and case studies', 'Peer-to-peer sharing (Forum-style)'],
    perspective_diversity: 'Very important — I learn most from different viewpoints',
    open_dream_event: 'A workshop with a founder who has built a $50M+ business, at a cool rooftop venue in Scottsdale.',
    open_speaker_wish: 'Jesse Itzler or someone similar — high energy, real stories.',
    open_feedback: 'Love Tuesday evenings. More opportunities for deep conversation.',
    is_complete: true,
  },
  {
    user_id: '4',
    profiles: { full_name: 'Lisa Chen', email: 'lisa@eoarizona.com' },
    energy_formats: ['Small-group workshop (hands-on)', 'Behind-the-scenes tour or site visit'],
    energy_ranking: ['Practical takeaways I can use immediately', 'Quality of the speaker / content', 'Networking time with other members', 'Food & beverage experience', 'Venue & atmosphere'],
    energy_time: '3–4 hours (half-day workshop)',
    growth_topics: ['Sales & revenue growth', 'Marketing & brand building', 'Finance & cash flow', 'Exit planning / succession'],
    growth_stage: 'Established — optimizing operations',
    growth_challenge: 'Growing revenue predictably',
    growth_stretch: 3,
    joy_social: ['Meeting members I don\'t know yet', 'Spouse / partner-friendly events'],
    joy_venue: 'Private dining room at a great restaurant',
    joy_speakers: ['Subject matter expert (deep knowledge)', 'Author of a book I\'ve read', 'Local Arizona success story'],
    perspective_style: ['Data, research, and frameworks', 'Hands-on doing (build something, cook, etc.)'],
    perspective_diversity: 'Somewhat important — nice to have variety',
    open_dream_event: 'A half-day strategy session with a finance expert, then a great dinner.',
    open_speaker_wish: 'Patrick Lencioni or a team-building expert.',
    open_feedback: 'Thursday works best for me. Vegan-friendly food options appreciated.',
    is_complete: true,
  },
]

export default function SurveyResultsPage() {
  const { activeChapterId } = useChapter()
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState(null)
  const [selectedResponse, setSelectedResponse] = useState(null)

  const fetchResponses = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setResponses(MOCK_RESPONSES)
      setLoading(false)
      return
    }
    if (!activeChapterId) {
      setResponses([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('survey_responses')
      .select('*, profiles(full_name, email)')
      .eq('is_complete', true)
      .eq('chapter_id', activeChapterId)
    setResponses(data || [])
    setLoading(false)
  }, [activeChapterId])

  useEffect(() => { fetchResponses() }, [fetchResponses])

  // Aggregate multi-select answers
  const aggregateMultiSelect = (questionId) => {
    const question = SURVEY_SECTIONS.flatMap(s => s.questions).find(q => q.id === questionId)
    if (!question) return []
    const counts = {}
    question.options.forEach(opt => { counts[opt] = 0 })
    responses.forEach(r => {
      const val = r[question.column]
      if (Array.isArray(val)) val.forEach(v => { if (counts[v] !== undefined) counts[v]++ })
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }

  // Aggregate single-select answers
  const aggregateSingleSelect = (questionId) => {
    const question = SURVEY_SECTIONS.flatMap(s => s.questions).find(q => q.id === questionId)
    if (!question) return []
    const counts = {}
    question.options.forEach(opt => { counts[opt] = 0 })
    responses.forEach(r => {
      const val = r[question.column]
      if (val && counts[val] !== undefined) counts[val]++
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }

  // Aggregate scale answers
  const aggregateScale = (questionId) => {
    const question = SURVEY_SECTIONS.flatMap(s => s.questions).find(q => q.id === questionId)
    if (!question) return { avg: 0, distribution: [] }
    const values = responses.map(r => r[question.column]).filter(v => v != null)
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const dist = Array.from({ length: question.max - question.min + 1 }, (_, i) => {
      const n = question.min + i
      return { value: n, count: values.filter(v => v === n).length }
    })
    return { avg: avg.toFixed(1), distribution: dist }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-warm" />
          Survey Results
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {responses.length} completed responses
        </p>
      </div>

      {responses.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <BarChart3 className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No survey responses yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Responses will appear here once members complete the survey</p>
        </div>
      ) : (
        <>
          {/* Aggregated Results by Section */}
          <div className="space-y-3">
            {SURVEY_SECTIONS.map(section => (
              <div key={section.id} className="rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{section.title}</span>
                    <Badge variant="outline" className="text-[10px]">{section.questions.length} questions</Badge>
                  </div>
                  {expandedSection === section.id
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                </button>

                {expandedSection === section.id && (
                  <div className="border-t border-border px-5 py-4 space-y-6">
                    {section.questions.map(question => {
                      if (question.type === 'multi_select') {
                        const data = aggregateMultiSelect(question.id)
                        const maxCount = Math.max(...data.map(d => d[1]), 1)
                        return (
                          <div key={question.id}>
                            <h4 className="text-sm font-medium mb-3">{question.label}</h4>
                            <div className="space-y-1.5">
                              {data.map(([label, count]) => (
                                <div key={label} className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="h-5 bg-primary/20 rounded" style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? '4px' : 0 }} />
                                      <span className="text-xs text-muted-foreground shrink-0">{count}</span>
                                    </div>
                                  </div>
                                  <span className="text-xs w-48 text-right truncate">{label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }

                      if (question.type === 'single_select') {
                        const data = aggregateSingleSelect(question.id)
                        const maxCount = Math.max(...data.map(d => d[1]), 1)
                        return (
                          <div key={question.id}>
                            <h4 className="text-sm font-medium mb-3">{question.label}</h4>
                            <div className="space-y-1.5">
                              {data.map(([label, count]) => (
                                <div key={label} className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="h-5 bg-warm/20 rounded" style={{ width: `${(count / maxCount) * 100}%`, minWidth: count > 0 ? '4px' : 0 }} />
                                      <span className="text-xs text-muted-foreground shrink-0">{count}</span>
                                    </div>
                                  </div>
                                  <span className="text-xs w-48 text-right truncate">{label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }

                      if (question.type === 'scale') {
                        const { avg, distribution } = aggregateScale(question.id)
                        return (
                          <div key={question.id}>
                            <h4 className="text-sm font-medium mb-2">{question.label}</h4>
                            <p className="text-2xl font-bold text-primary mb-2">{avg} <span className="text-xs font-normal text-muted-foreground">avg</span></p>
                            <div className="flex items-end gap-2 h-12">
                              {distribution.map(d => (
                                <div key={d.value} className="flex-1 flex flex-col items-center gap-1">
                                  <div className="w-full bg-primary/20 rounded-t" style={{ height: `${(d.count / Math.max(...distribution.map(x => x.count), 1)) * 40}px`, minHeight: d.count > 0 ? '4px' : 0 }} />
                                  <span className="text-[10px] text-muted-foreground">{d.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }

                      if (question.type === 'ranking') {
                        // Show average rank position
                        const question_ = question
                        const avgRanks = question_.options.map(opt => {
                          const positions = responses.map(r => {
                            const val = r[question_.column]
                            return Array.isArray(val) ? val.indexOf(opt) : -1
                          }).filter(p => p >= 0)
                          const avgPos = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : question_.options.length
                          return { label: opt, avgRank: avgPos + 1 }
                        }).sort((a, b) => a.avgRank - b.avgRank)

                        return (
                          <div key={question.id}>
                            <h4 className="text-sm font-medium mb-3">{question.label}</h4>
                            <div className="space-y-1">
                              {avgRanks.map((item, idx) => (
                                <div key={item.label} className="flex items-center gap-3 text-xs">
                                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">{idx + 1}</span>
                                  <span className="flex-1">{item.label}</span>
                                  <span className="text-muted-foreground">avg #{item.avgRank.toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }

                      if (question.type === 'open_text') {
                        const answers = responses.map(r => ({ name: r.profiles?.full_name || 'Anonymous', text: r[question.column] })).filter(a => a.text)
                        return (
                          <div key={question.id}>
                            <h4 className="text-sm font-medium mb-3">{question.label}</h4>
                            {answers.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No responses</p>
                            ) : (
                              <div className="space-y-2">
                                {answers.map((a, i) => (
                                  <div key={i} className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">{a.name}</p>
                                    <p className="text-sm">{a.text}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      }

                      return null
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Individual Responses */}
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              Individual Responses
            </h2>
            <div className="space-y-2">
              {responses.map(r => (
                <button
                  key={r.user_id}
                  onClick={() => setSelectedResponse(selectedResponse === r.user_id ? null : r.user_id)}
                  className="w-full text-left rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{r.profiles?.full_name || 'Anonymous'}</p>
                      <p className="text-xs text-muted-foreground">{r.profiles?.email}</p>
                    </div>
                    {selectedResponse === r.user_id
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                  {selectedResponse === r.user_id && (
                    <div className="mt-4 space-y-4 border-t border-border pt-4" onClick={(e) => e.stopPropagation()}>
                      {SURVEY_SECTIONS.map(section => (
                        <div key={section.id}>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{section.title}</h4>
                          {section.questions.map(q => {
                            const val = r[q.column]
                            if (val == null) return null
                            return (
                              <div key={q.id} className="mb-2">
                                <p className="text-xs text-muted-foreground">{q.label}</p>
                                <p className="text-sm mt-0.5">
                                  {Array.isArray(val) ? val.join(', ') : String(val)}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
