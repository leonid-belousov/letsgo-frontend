/**
 * Localization seam. The docs approve no language list yet (PROJECT_ANALYSIS §29),
 * so only English technical placeholders exist. Swap this for a real i18n
 * library once languages are decided; call sites already use `t()`.
 */
const en = {
  'nav.home': 'Home',
  'nav.discovery': 'Discovery',
  'nav.create': 'Create',
  'nav.chat': 'Chat',
  'nav.profile': 'Profile',
  'app.title': 'Let’sGo',
  'placeholder.body': 'This section is not built yet.',
  'auth.signIn': 'Sign in',
  'auth.signUp': 'Sign up',
  'auth.identifier': 'E-mail or phone',
  'auth.password': 'Password',
  'auth.identifierRequired': 'Enter your e-mail or phone',
  'auth.passwordTooShort': 'Use at least 8 characters',
  'auth.invalidCredentials': 'Wrong e-mail/phone or password.',
  'auth.noAccount': 'New to Let’sGo?',
  'auth.haveAccount': 'Already have an account?',
  'profile.complete': 'Complete your profile',
  'profile.completeBody': 'Add the details needed to join games and clubs.',
  'profile.nickname': 'Nickname',
  'profile.username': 'Username',
  'profile.dateOfBirth': 'Date of birth',
  'profile.city': 'City',
  'profile.bio': 'Bio',
  'profile.continue': 'Continue',
  'common.back': 'Back',
  'games.loading': 'Loading games',
  'games.empty': 'No games found',
  'games.emptyBody': 'Try again later or change your filters.',
  'games.upcoming': 'Upcoming games',
  'games.moreAvailable': 'More games available',
  'games.notFound': 'Game not found',
  'games.requestJoin': 'Request to join',
  'games.join': 'Join game',
  'games.leave': 'Leave game',
  'games.working': 'Working…',
  'games.noNotes': 'No notes for this game.',
  'search.title': 'Search',
  'search.body': 'Find people, clubs, venues, tournaments and events.',
  'search.filtersTitle': 'Filters',
  'search.filtersBody': 'Narrow results by entity type.',
  'search.query': 'Search',
  'search.queryPlaceholder': 'Try a name or @username',
  'search.type': 'Type',
  'search.allTypes': 'All types',
  'search.submit': 'Search',
  'search.startTitle': 'Start a search',
  'search.startBody': 'Enter at least one character to search the directory.',
  'search.loading': 'Searching',
  'search.empty': 'No results found',
  'search.emptyBody': 'Try a different name or filter.',
  'search.results': 'Results',
} as const;

export type MessageKey = keyof typeof en;

export function t(key: MessageKey): string {
  return en[key];
}
