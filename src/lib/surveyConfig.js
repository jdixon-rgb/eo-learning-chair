// EO Arizona Learning Genome Survey
// 5 sections, ~15 questions — adapted for EO Arizona chapter context
// Responses feed into event planning so the Learning Chair can design
// a calendar that resonates with the actual membership.

export const SURVEY_SECTIONS = [
  {
    id: 1,
    title: 'Energy & Engagement',
    subtitle: 'What lights you up at learning events?',
    questions: [
      {
        id: 'energy_formats',
        type: 'multi_select',
        label: 'Which event formats energize you most?',
        description: 'Select all that apply',
        options: [
          'Keynote with Q&A',
          'Small-group workshop (hands-on)',
          'Panel discussion with multiple speakers',
          'Fireside chat / interview format',
          'Behind-the-scenes tour or site visit',
          'Dinner with a speaker',
          'Outdoor / experiential activity',
        ],
        column: 'energy_formats',
      },
      {
        id: 'energy_ranking',
        type: 'ranking',
        label: 'Rank these event elements from most to least important to you:',
        options: [
          'Quality of the speaker / content',
          'Networking time with other members',
          'Venue & atmosphere',
          'Food & beverage experience',
          'Practical takeaways I can use immediately',
        ],
        column: 'energy_ranking',
      },
      {
        id: 'energy_time',
        type: 'single_select',
        label: 'What event length do you prefer?',
        options: [
          '90 minutes (focused keynote)',
          '2 hours (keynote + networking)',
          '3–4 hours (half-day workshop)',
          'Full day immersion',
          'I enjoy a mix throughout the year',
        ],
        column: 'energy_time',
      },
    ],
  },
  {
    id: 2,
    title: 'Growth Edge & Challenge',
    subtitle: 'Where do you want to grow this year?',
    questions: [
      {
        id: 'growth_topics',
        type: 'multi_select',
        label: 'Which topics interest you most right now?',
        description: 'Select up to 5',
        maxSelections: 5,
        options: [
          'Leadership & management',
          'Sales & revenue growth',
          'Marketing & brand building',
          'Finance & cash flow',
          'Operations & systems',
          'Technology & AI',
          'Health & wellness',
          'Relationships & communication',
          'Mindset & performance',
          'Exit planning / succession',
          'Real estate / investing',
          'Giving back / philanthropy',
        ],
        column: 'growth_topics',
      },
      {
        id: 'growth_stage',
        type: 'single_select',
        label: 'Where is your business right now?',
        options: [
          'Early stage — building the foundation',
          'Growth mode — scaling fast',
          'Established — optimizing operations',
          'Transition — exploring exit or next chapter',
          'Serial entrepreneur — running multiple ventures',
        ],
        column: 'growth_stage',
      },
      {
        id: 'growth_challenge',
        type: 'single_select',
        label: 'What\'s your biggest challenge this year?',
        options: [
          'Finding and keeping great people',
          'Growing revenue predictably',
          'Work-life integration',
          'Staying motivated / avoiding burnout',
          'Making strategic decisions with confidence',
          'Building the right partnerships',
        ],
        column: 'growth_challenge',
      },
      {
        id: 'growth_stretch',
        type: 'scale',
        label: 'How much do you want to be challenged at events?',
        description: '1 = Keep it comfortable, 5 = Push me hard',
        min: 1,
        max: 5,
        labels: ['Comfortable', 'Push me'],
        column: 'growth_stretch',
      },
    ],
  },
  {
    id: 3,
    title: 'Affinity & Joy',
    subtitle: 'What makes an event memorable for you?',
    questions: [
      {
        id: 'joy_social',
        type: 'multi_select',
        label: 'What social elements do you value most?',
        description: 'Select all that apply',
        options: [
          'Meeting members I don\'t know yet',
          'Deep conversations with a few people',
          'Spouse / partner-friendly events',
          'Fun, lighthearted atmosphere',
          'Competitive elements (games, challenges)',
          'Shared meals with intentional seating',
        ],
        column: 'joy_social',
      },
      {
        id: 'joy_venue',
        type: 'single_select',
        label: 'What kind of venue excites you?',
        options: [
          'Upscale hotel ballroom',
          'Unique / unconventional space (brewery, ranch, rooftop)',
          'Private dining room at a great restaurant',
          'Outdoor venue (nature, desert, poolside)',
          'Member\'s business or office',
          'No strong preference — content matters most',
        ],
        column: 'joy_venue',
      },
      {
        id: 'joy_speakers',
        type: 'multi_select',
        label: 'What type of speakers do you gravitate toward?',
        description: 'Select up to 3',
        maxSelections: 3,
        options: [
          'Celebrity / famous name',
          'Fellow entrepreneur with a great story',
          'Subject matter expert (deep knowledge)',
          'Motivational / high-energy performer',
          'Local Arizona success story',
          'Author of a book I\'ve read',
        ],
        column: 'joy_speakers',
      },
    ],
  },
  {
    id: 4,
    title: 'Perspective & Diversity',
    subtitle: 'How do you like to learn?',
    questions: [
      {
        id: 'perspective_style',
        type: 'multi_select',
        label: 'Which learning styles resonate with you?',
        description: 'Select all that apply',
        options: [
          'Listening to stories and case studies',
          'Interactive exercises and role-playing',
          'Data, research, and frameworks',
          'Peer-to-peer sharing (Forum-style)',
          'Hands-on doing (build something, cook, etc.)',
          'Reflection and journaling',
        ],
        column: 'perspective_style',
      },
      {
        id: 'perspective_diversity',
        type: 'single_select',
        label: 'How important is it that events feature diverse perspectives?',
        options: [
          'Very important — I learn most from different viewpoints',
          'Somewhat important — nice to have variety',
          'Neutral — I focus on the content, not the background',
          'Less important — I prefer deep expertise in one area',
        ],
        column: 'perspective_diversity',
      },
    ],
  },
  {
    id: 5,
    title: 'Open Signals',
    subtitle: 'Tell us in your own words',
    questions: [
      {
        id: 'open_dream_event',
        type: 'open_text',
        label: 'Describe your dream EO learning event',
        description: 'No constraints — if you could design the perfect event, what would it look like?',
        placeholder: 'e.g., A half-day workshop with a founder who scaled to $100M, held at a cool venue in Scottsdale, with a dinner afterward where we discuss the takeaways...',
        column: 'open_dream_event',
      },
      {
        id: 'open_speaker_wish',
        type: 'open_text',
        label: 'Is there a specific speaker or topic you\'d love to see?',
        description: 'Name names if you have them — or describe the type of person.',
        placeholder: 'e.g., Jesse Itzler, Sara Blakely, or someone who\'s built a business in the Arizona market...',
        column: 'open_speaker_wish',
      },
      {
        id: 'open_feedback',
        type: 'open_text',
        label: 'Anything else the Learning Chair should know?',
        description: 'Scheduling preferences, dietary needs, ideas, gripes — all welcome.',
        placeholder: 'e.g., I prefer Tuesday or Thursday evenings. I\'m vegan. I love when we do events that include spouses...',
        column: 'open_feedback',
      },
    ],
  },
]

// Flat list of all question IDs for convenience
export const ALL_QUESTION_IDS = SURVEY_SECTIONS.flatMap(s => s.questions.map(q => q.id))

// Map question ID -> column name for Supabase storage
export const QUESTION_COLUMN_MAP = Object.fromEntries(
  SURVEY_SECTIONS.flatMap(s => s.questions.map(q => [q.id, q.column]))
)
