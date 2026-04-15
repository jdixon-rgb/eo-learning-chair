// Role-specific contextual tour tips.
// Keyed by route path → role → { title, body }.
// Tips appear as dismissible banners the first time a user visits each page.

export const TOUR_CONTENT = {
  '/': {
    learning_chair: {
      title: 'Welcome, Learning Chair',
      body: 'This is your command center. From here you manage the full year arc — speakers, events, venues, and budgets. Your sidebar shows every tool. Start with the Year Arc to see your roadmap.',
    },
    president: {
      title: 'Welcome, President',
      body: 'You have visibility across every chair and the full chapter. Your Platform is at /president. You can also view-as any chair role from the sidebar to see what they see.',
    },
    president_elect: {
      title: 'Welcome, President Elect',
      body: 'You see the same surfaces as the President. Use the fiscal year selector to toggle between the current year and your upcoming year.',
    },
    engagement_chair: {
      title: 'Welcome, Member Engagement Chair',
      body: 'Your workspace is built around Navigators, Mentors, and Pairings. Head to your Dashboard to see chapter engagement at a glance.',
    },
    finance_chair: {
      title: 'Welcome, Finance Chair',
      body: 'You oversee the fiscal year budget across all chairs. The Chapter Budget page is where you set and review line items.',
    },
  },

  '/calendar': {
    learning_chair: {
      title: 'Your Year Arc',
      body: 'The 10-month fiscal year laid out with strategic context for each month — Kickoff, Momentum, Renewal, etc. Each tile shows the event for that month and how it ladders to the president\'s theme.',
    },
    president: {
      title: 'Year Arc',
      body: 'The Learning Chair\'s strategic view of the year. Every month is tagged with its strategic importance (kickoff, renewal, etc.) so you can see the arc at a glance.',
    },
  },

  '/speakers': {
    learning_chair: {
      title: 'Speaker Pipeline',
      body: 'Kanban view of speakers from researching through confirmed. Drag cards between stages. Click a speaker to edit details, add fees, upload their contract and W-9, and assign them to events.',
    },
  },

  '/events': {
    learning_chair: {
      title: 'Events',
      body: 'All fiscal year events. Click any event to open its detail page where you manage the speaker, venue, budget, contract checklist, marketing milestones, and SAP partnerships.',
    },
    president: {
      title: 'Events',
      body: 'The full event roster for the fiscal year. Click any event to see its full operational picture.',
    },
  },

  '/partners': {
    learning_chair: {
      title: 'Strategic Alliance Partners',
      body: 'Your SAP partners grouped by tier (Platinum, Gold, Silver, In-Kind). Expand a partner to see contacts. Use the eye icon on a contact to preview their SAP portal experience.',
    },
    president: {
      title: 'Strategic Alliance Partners',
      body: 'All chapter SAP partners by tier. Partners feed the Vendor Exchange as premium vendors and can be invited to attend or present at events.',
    },
    strategic_alliances: {
      title: 'Your Partner Roster',
      body: 'This is your home base. Manage every SAP partner, track their contacts, and monitor chapter-side feedback. Use the invite icon to grant a partner access to their own portal.',
    },
  },

  '/venues': {
    learning_chair: {
      title: 'Venues',
      body: 'Venue pipeline with Kanban, table, and library views. Track every space you\'re evaluating, save ratings after events, and archive the ones you\'re done with.',
    },
  },

  '/budget': {
    learning_chair: {
      title: 'Event Budget',
      body: 'Aggregated budget across all events. Each event has its own line items (speaker fees, F&B, venue rental). Use this page to see where money is committed vs. actual.',
    },
    finance_chair: {
      title: 'Event Budget (Learning)',
      body: 'The Learning Chair\'s per-event budget. For the chapter-wide FY budget across every chair, go to Chapter Budget on your sidebar.',
    },
    president: {
      title: 'Event Budget',
      body: 'Learning Chair\'s event-level spending. For the FY budget across every chair, use Chapter Budget.',
    },
  },

  '/scenarios': {
    learning_chair: {
      title: 'What-If Scenarios',
      body: 'Model alternate versions of the year. Build scenarios that swap speakers, venues, or budgets — compare them side-by-side without touching your real plan.',
    },
  },

  '/engagement': {
    engagement_chair: {
      title: 'Engagement Dashboard',
      body: 'The heart of member engagement. See chapter health at a glance, check on your Navigators and Mentors, and review recent pairings.',
    },
    president: {
      title: 'Engagement Dashboard',
      body: 'The Member Engagement Chair\'s view. See how Navigators and Mentors are deployed across the chapter.',
    },
  },

  '/engagement/navigators': {
    engagement_chair: {
      title: 'Navigators',
      body: 'Members who welcome and orient new EO members. Track assignments, check-ins, and broadcasts here.',
    },
  },

  '/engagement/mentors': {
    engagement_chair: {
      title: 'Mentors',
      body: 'Experienced members paired with members seeking guidance. Manage the mentor roster and active pairings.',
    },
  },

  '/engagement/pairings': {
    engagement_chair: {
      title: 'Pairings',
      body: 'Active Navigator and Mentor pairings. Match new members with the right person and track progress over time.',
    },
  },

  '/president': {
    president: {
      title: 'President Dashboard',
      body: 'Your chapter-wide view — every chair, every module, rolled into one. Set the theme for your year, review chair progress, and access the FY budget.',
    },
    president_elect: {
      title: 'President Dashboard (Preview)',
      body: 'This will be your view next fiscal year. Use the FY selector to toggle between the current year and your incoming year to plan ahead.',
    },
  },

  '/president/budget': {
    president: {
      title: 'Chapter Budget',
      body: 'The full fiscal year budget across every chair. Set total budget and per-chair line items. This is the authoritative FY budget for the chapter.',
    },
    finance_chair: {
      title: 'Chapter Budget',
      body: 'Your primary workspace. Set the total FY budget and allocate line items to each chair. Chairs see their allocation read-only.',
    },
  },

  '/board': {
    president: {
      title: 'Board Dashboard',
      body: 'Cross-functional view for the board. Access chair reports, communications, forum health, and member scorecards.',
    },
    board_liaison: {
      title: 'Board Dashboard',
      body: 'Your entry point to board-level tools. Review chair reports, communications, and forum health.',
    },
    finance_chair: {
      title: 'Board Dashboard',
      body: 'Board tools and reports. Finance-specific views live on the Chapter Budget page.',
    },
  },

  '/board/reports': {
    president: {
      title: 'Chair Reports',
      body: 'Each chair\'s monthly report rolled up here. Review progress, flag concerns, and keep the board aligned.',
    },
  },

  '/settings': {
    president: {
      title: 'Chapter Settings',
      body: 'Manage chapter configuration — total budget, fiscal year, president\'s theme, and board positions. Changes here affect the whole chapter.',
    },
    chapter_executive_director: {
      title: 'Chapter Settings',
      body: 'Chapter-level configuration. You and the President manage board positions and chapter metadata.',
    },
    chapter_experience_coordinator: {
      title: 'Chapter Settings',
      body: 'Chapter-level configuration. Board positions and member assignments live here.',
    },
  },
}
