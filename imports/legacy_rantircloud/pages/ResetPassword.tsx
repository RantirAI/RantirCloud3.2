import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { CheckCircle, Loader2 } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from the magic link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      } else if (event === 'SIGNED_IN') {
        // Also handle SIGNED_IN since the recovery link signs the user in
        setSessionReady(true);
      }
    });

    // Check if we already have a session (user clicked the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        // Give it a moment for the hash to be processed
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) {
              setSessionReady(true);
            } else {
              setError("Invalid or expired reset link. Please request a new one.");
            }
          });
        }, 1500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/auth", { replace: true }), 2000);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-6 bg-card rounded-xl shadow-sm border">
        <div className="flex flex-col items-center mb-6">
          <div className="mb-4">
            <Logo className="h-10 w-auto" />
          </div>

          {success ? (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-center mb-2">Password updated</h1>
              <p className="text-sm text-muted-foreground text-center">
                Your password has been reset. Redirecting to login...
              </p>
            </>
          ) : error ? (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">Reset link expired</h1>
              <p className="text-sm text-muted-foreground text-center mb-4">{error}</p>
              <Button onClick={() => navigate("/forgot-password")} variant="outline">
                Request new link
              </Button>
            </>
          ) : !sessionReady ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
              <h1 className="text-2xl font-bold text-center mb-2">Verifying...</h1>
              <p className="text-sm text-muted-foreground text-center">
                Please wait while we verify your reset link.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">Set new password</h1>
              <p className="text-sm text-muted-foreground text-center">
                Enter your new password below.
              </p>
            </>
          )}
        </div>

        {sessionReady && !success && !error && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                placeholder="Enter new password"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={submitting}
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] px-6 py-3 text-sm font-medium"
              disabled={submitting}
            >
              {submitting ? "Updating..." : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
