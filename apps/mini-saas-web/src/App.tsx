import { useState, type FormEvent } from 'react';
import { GalleryVerticalEnd } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import type { AuthCredentials } from '@/features/auth/auth.api';
import {
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from '@/features/auth/auth.queries';

import { ProjectsWorkspace } from '@/features/projects/projects-workspace';

type AuthMode = 'login' | 'register';

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to reach the API. Please try again.';
}

function App() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const currentUserQuery = useCurrentUserQuery();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    loginMutation.reset();
    registerMutation.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credentials: AuthCredentials = { email, password };

    if (mode === 'register') {
      registerMutation.mutate(credentials, {
        onSuccess: () => {
          setMode('login');
          setPassword('');
        },
      });
      return;
    }

    loginMutation.mutate(credentials, {
      onSuccess: () => setPassword(''),
    });
  }

  const activeMutation = mode === 'login' ? loginMutation : registerMutation;

  if (currentUserQuery.isSuccess && currentUserQuery.data) {
    const user = currentUserQuery.data;
    return (
      <main className="min-h-svh bg-muted px-4 py-8 sm:px-6 lg:py-12">
        <div className="mx-auto grid max-w-5xl gap-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">
                Mini SaaS
              </h1>
              <p className="break-all text-sm text-muted-foreground">
                {user.email} · User #{user.id}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
            >
              {logoutMutation.isPending ? 'Logging out…' : 'Log out'}
            </Button>
          </header>
          {logoutMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>Logout failed</AlertTitle>
              <AlertDescription>
                {getErrorMessage(logoutMutation.error)}
              </AlertDescription>
            </Alert>
          )}
          <ProjectsWorkspace key={user.id} user={user} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <section className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </span>
          Mini SaaS
        </div>

        {currentUserQuery.isPending ? (
          <Card>
            <CardHeader className="text-center">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-36 w-full" />
            </CardContent>
          </Card>
        ) : currentUserQuery.isError ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>We could not check your session</CardTitle>
              <CardDescription>
                The API could not confirm whether you are signed in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertTitle>Request failed</AlertTitle>
                <AlertDescription>
                  {getErrorMessage(currentUserQuery.error)}
                </AlertDescription>
              </Alert>
              <Button
                className="mt-5 w-full"
                onClick={() => currentUserQuery.refetch()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </CardTitle>
              <CardDescription>
                {mode === 'login'
                  ? 'Sign in to continue to Mini SaaS.'
                  : 'Enter your details to create an account.'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </Field>

                  <Field data-invalid={activeMutation.isError}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={
                        mode === 'login' ? 'current-password' : 'new-password'
                      }
                      placeholder={
                        mode === 'login'
                          ? 'Enter your password'
                          : 'At least 15 characters'
                      }
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={mode === 'login' ? 1 : 15}
                      maxLength={128}
                      aria-invalid={activeMutation.isError}
                      required
                    />
                    {activeMutation.isError && (
                      <FieldError>
                        {getErrorMessage(activeMutation.error)}
                      </FieldError>
                    )}
                  </Field>

                  {mode === 'login' && registerMutation.isSuccess && (
                    <Alert>
                      <AlertTitle>Account created</AlertTitle>
                      <AlertDescription>
                        Registration did not create a Session. Sign in now.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Field>
                    <Button type="submit" disabled={activeMutation.isPending}>
                      {activeMutation.isPending && (
                        <Spinner data-icon="inline-start" />
                      )}
                      {activeMutation.isPending
                        ? mode === 'login'
                          ? 'Signing in…'
                          : 'Creating account…'
                        : mode === 'login'
                          ? 'Sign in'
                          : 'Create account'}
                    </Button>
                    <FieldDescription className="text-center">
                      {mode === 'login'
                        ? "Don't have an account?"
                        : 'Already have an account?'}{' '}
                      <button
                        type="button"
                        className="font-medium text-foreground underline underline-offset-4"
                        onClick={() =>
                          selectMode(mode === 'login' ? 'register' : 'login')
                        }
                      >
                        {mode === 'login' ? 'Create account' : 'Sign in'}
                      </button>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}

export default App;
