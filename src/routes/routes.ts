/**
 * Route registry (Handoff §11 groups). Parameters are stable entity IDs.
 * Only the groups needed for the first vertical slice will get real pages;
 * the rest are declared so navigation and deep links can be planned.
 */
export const paths = {
  // Authentication
  signIn: '/sign-in',
  signUp: '/sign-up',
  completeProfile: '/complete-profile',
  // Home / search / discovery
  home: '/',
  search: '/search',
  filters: '/filters',
  discovery: '/discovery',
  // Profiles
  profile: (id = ':userId') => `/people/${id}`,
  myProfile: '/me',
  settings: '/settings',
  // Games
  game: (id = ':gameId') => `/games/${id}`,
  createGame: '/games/new',
  // Clubs
  club: (id = ':clubId') => `/clubs/${id}`,
  createClub: '/clubs/new',
  // Tournaments
  tournament: (id = ':tournamentId') => `/tournaments/${id}`,
  createTournament: '/tournaments/new',
  // Venues / bookings
  venue: (id = ':venueId') => `/venues/${id}`,
  pitch: (id = ':pitchId') => `/pitches/${id}`,
  bookPitch: '/bookings/new',
  bookings: '/bookings',
  // Chat / activity / payments
  chat: '/chat',
  activity: '/activity',
  notifications: '/notifications',
  payments: '/me/payments',
} as const;
