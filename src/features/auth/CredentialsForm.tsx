import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ApiRequestError, userMessageFor } from '@/api/errors';
import { Button, Card, TextField } from '@/design/ui';
import { t } from '@/i18n';
import { useCredentialsAuth, type Credentials } from './hooks';
import { paths } from '@/routes/routes';

const credentialsSchema = z.object({
  identifier: z.string().trim().min(1, t('auth.identifierRequired')),
  password: z.string().min(8, t('auth.passwordTooShort')),
});

function validationMessage(error: ApiRequestError, field: 'identifier' | 'password') {
  const issues = error.details?.issues;
  if (!Array.isArray(issues)) return undefined;
  const issue = issues.find((candidate) => {
    if (!candidate || typeof candidate !== 'object') return false;
    const path = (candidate as { path?: unknown }).path;
    return Array.isArray(path) && (path[0] === field || (field === 'identifier' && (path[0] === 'email' || path[0] === 'phone')));
  });
  return issue && typeof (issue as { message?: unknown }).message === 'string'
    ? (issue as { message: string }).message
    : undefined;
}

export function CredentialsForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const mutation = useCredentialsAuth(mode);
  const { register, handleSubmit, formState } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { identifier: '', password: '' },
  });
  const backendError = mutation.error instanceof ApiRequestError ? mutation.error : null;
  const fallbackError = backendError
    ? backendError.code === 'UNAUTHENTICATED'
      ? t('auth.invalidCredentials')
      : userMessageFor(backendError.code)
    : undefined;

  const submit = handleSubmit((values) =>
    mutation.mutate(values, {
      onSuccess: () => {
        const from = location.state as { from?: { pathname?: string } } | null;
        navigate(from?.from?.pathname ?? paths.home, { replace: true });
      },
    }),
  );

  return (
    <main className="lg-shell__main">
      <Card>
        <h1>{t(mode === 'sign-in' ? 'auth.signIn' : 'auth.signUp')}</h1>
        <form onSubmit={submit} noValidate>
          <TextField
            label={t('auth.identifier')}
            requiredMark
            autoComplete="username"
            autoCapitalize="none"
            {...register('identifier')}
            error={formState.errors.identifier?.message ?? (backendError ? validationMessage(backendError, 'identifier') : undefined)}
          />
          <TextField
            label={t('auth.password')}
            requiredMark
            type="password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            {...register('password')}
            error={formState.errors.password?.message ?? (backendError ? validationMessage(backendError, 'password') : undefined)}
          />
          {fallbackError ? <p role="alert">{fallbackError}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {t(mode === 'sign-in' ? 'auth.signIn' : 'auth.signUp')}
          </Button>
          <p>
            {t(mode === 'sign-in' ? 'auth.noAccount' : 'auth.haveAccount')}{' '}
            <Link to={mode === 'sign-in' ? paths.signUp : paths.signIn}>
              {t(mode === 'sign-in' ? 'auth.signUp' : 'auth.signIn')}
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
