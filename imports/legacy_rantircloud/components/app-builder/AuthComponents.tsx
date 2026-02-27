import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppComponent } from '@/types/appBuilder';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, LogOut } from 'lucide-react';

interface LoginFormComponentProps {
  component: AppComponent;
  onAction?: (actionType: string, data: any) => void;
}

export function LoginFormComponent({ component, onAction }: LoginFormComponentProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Trigger success action if configured
      if (onAction && component.props.onSuccessAction) {
        onAction(component.props.onSuccessAction.type, component.props.onSuccessAction.config);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogIn className="h-5 w-5" />
          {component.props.title || 'Sign In'}
        </CardTitle>
        {component.props.description && (
          <CardDescription>{component.props.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder={component.props.emailPlaceholder || "Enter your email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={component.props.passwordPlaceholder || "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 px-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : component.props.submitText || "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function RegisterFormComponent({ component, onAction }: LoginFormComponentProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      setSuccess(true);
      
      // Trigger success action if configured
      if (onAction && component.props.onSuccessAction) {
        onAction(component.props.onSuccessAction.type, component.props.onSuccessAction.config);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>
              Registration successful! Please check your email to confirm your account.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          {component.props.title || 'Create Account'}
        </CardTitle>
        {component.props.description && (
          <CardDescription>{component.props.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder={component.props.emailPlaceholder || "Enter your email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={component.props.passwordPlaceholder || "Create a password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 px-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : component.props.submitText || "Create Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function UserProfileComponent({ component }: { component: AppComponent }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {component.props.notLoggedInText || "Please log in to view your profile"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {component.props.title || 'User Profile'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Email</Label>
          <div className="p-2 bg-muted rounded-md text-sm">
            {user.email}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">User ID</Label>
          <div className="p-2 bg-muted rounded-md text-sm font-mono text-xs">
            {user.id}
          </div>
        </div>

        {user.last_sign_in_at && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Last Sign In</Label>
            <div className="p-2 bg-muted rounded-md text-sm">
              {new Date(user.last_sign_in_at).toLocaleString()}
            </div>
          </div>
        )}

        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full"
          disabled={loading}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {loading ? "Signing out..." : "Sign Out"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function AuthStatusComponent({ component }: { component: AppComponent }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
        <span className="text-sm text-muted-foreground">Checking authentication...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-sm">
        {user ? (
          component.props.loggedInText || `Signed in as ${user.email}`
        ) : (
          component.props.loggedOutText || 'Not signed in'
        )}
      </span>
      {component.props.showStatus && (
        <Badge variant={user ? 'default' : 'secondary'}>
          {user ? 'Authenticated' : 'Guest'}
        </Badge>
      )}
    </div>
  );
}