import { createBrowserRouter } from 'react-router-dom';
import { CredentialsForm } from '@/features/auth/CredentialsForm';
import { AppShell } from './AppShell';
import { PublicOnly, RequireAuth } from './guards';
import {
  CompleteProfilePage,
  BookPitchPage,
  BookingsPage,
  ActivityPage,
  ChatPage,
  ClubDetailsPage,
  CreateClubPage,
  CreateGamePage,
  CreateTournamentPage,
  DiscoveryPage,
  HomePage,
  NotFoundPage,
  NotificationsPage,
  PitchDetailsPage,
  ProfilePage,
  PaymentsPage,
  PublicProfilePage,
  SettingsPage,
  TournamentDetailsPage,
  VenueDetailsPage,
} from './pages';
import { GameDetailsPage } from '@/features/games/pages';
import { SearchPage } from '@/features/search/pages';
import { paths } from './routes';

export const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: paths.search, element: <SearchPage /> },
          { path: paths.filters, element: <SearchPage filterMode /> },
          { path: paths.discovery, element: <DiscoveryPage /> },
          { path: paths.myProfile, element: <ProfilePage /> },
          { path: paths.profile(), element: <PublicProfilePage /> },
          { path: paths.game(), element: <GameDetailsPage /> },
          { path: paths.createGame, element: <CreateGamePage /> },
          { path: paths.club(), element: <ClubDetailsPage /> },
          { path: paths.createClub, element: <CreateClubPage /> },
          { path: paths.tournament(), element: <TournamentDetailsPage /> },
          { path: paths.createTournament, element: <CreateTournamentPage /> },
          { path: paths.venue(), element: <VenueDetailsPage /> },
          { path: paths.pitch(), element: <PitchDetailsPage /> },
          { path: paths.bookPitch, element: <BookPitchPage /> },
          { path: paths.bookings, element: <BookingsPage /> },
          { path: paths.chat, element: <ChatPage /> },
          { path: paths.activity, element: <ActivityPage /> },
          { path: paths.notifications, element: <NotificationsPage /> },
          { path: paths.payments, element: <PaymentsPage /> },
          { path: paths.settings, element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      { path: paths.completeProfile, element: <CompleteProfilePage /> },
    ],
  },
  {
    element: <PublicOnly />,
    children: [
      { path: paths.signIn, element: <CredentialsForm mode="sign-in" /> },
      { path: paths.signUp, element: <CredentialsForm mode="sign-up" /> },
    ],
  },
]);
