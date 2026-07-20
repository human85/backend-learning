import { useState, type FormEvent } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AuthCredentials } from '@/features/auth/auth.api';
import {
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from '@/features/auth/auth.queries';

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

  function selectMode(value: string | number | null) {
    if (value !== 'login' && value !== 'register') {
      return;
    }

    setMode(value);
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

  return (
    <main className="flex min-h-svh flex-col bg-muted/40">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <span className="font-heading text-lg font-semibold">Mini SaaS</span>
        <span className="text-sm text-muted-foreground">
          Session authentication
        </span>
      </header>

      <section className="flex flex-1 items-center justify-center p-4 sm:p-8">
        {currentUserQuery.isPending ? (
          <Card className="w-full max-w-md">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-36 w-full" />
            </CardContent>
          </Card>
        ) : currentUserQuery.isError ? (
          <Card className="w-full max-w-md">
            <CardHeader>
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
            </CardContent>
            <CardFooter>
              <Button onClick={() => currentUserQuery.refetch()}>
                Try again
              </Button>
            </CardFooter>
          </Card>
        ) : currentUserQuery.data ? (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Signed in</CardTitle>
              <CardDescription>
                The API restored your identity from the server-side Session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="break-all font-medium">
                {currentUserQuery.data.email}
              </p>
              {logoutMutation.isError && (
                <Alert className="mt-4" variant="destructive">
                  <AlertTitle>Logout failed</AlertTitle>
                  <AlertDescription>
                    {getErrorMessage(logoutMutation.error)}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                disabled={logoutMutation.isPending}
                onClick={() => logoutMutation.mutate()}
              >
                {logoutMutation.isPending && (
                  <Spinner data-icon="inline-start" />
                )}
                {logoutMutation.isPending ? 'Logging out…' : 'Log out'}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-full max-w-md">
            <Tabs value={mode} onValueChange={selectMode}>
              <CardHeader>
                <TabsList className="grid w-full grid-cols-2" variant="line">
                  <TabsTrigger value="login">Sign in</TabsTrigger>
                  <TabsTrigger value="register">Create account</TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value={mode}>
                <CardHeader>
                  <CardTitle>
                    {mode === 'login' ? 'Welcome back' : 'Create your account'}
                  </CardTitle>
                  <CardDescription>
                    {mode === 'login'
                      ? 'Sign in to create a server-side Session.'
                      : 'Registration creates a user, but does not sign you in.'}
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                  <CardContent>
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
                            mode === 'login'
                              ? 'current-password'
                              : 'new-password'
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
                    </FieldGroup>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      type="submit"
                      disabled={activeMutation.isPending}
                    >
                      {activeMutation.isPending && (
                        <Spinner data-icon="inline-start" />
                      )}
                      {activeMutation.isPending
                        ? mode === 'login'
                          ? 'Signing in…'
                          : 'Creating account…'
                        : 'Continue'}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </section>
    </main>
  );
}

export default App;
