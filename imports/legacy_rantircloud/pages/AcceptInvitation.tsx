import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { workspaceService } from '@/services/workspaceService';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    acceptInvitation();
  }, []);

  const acceptInvitation = async () => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link');
      setLoading(false);
      return;
    }

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login with return URL
        const returnUrl = `/accept-invitation?token=${token}`;
        navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }

      // Accept the invitation
      const { data, error } = await supabase.rpc('accept_workspace_invitation', {
        invitation_token: token
      });

      if (error) {
        throw error;
      }

      // Set the workspace as current if workspace_id is returned
      const result = data as { success: boolean; workspace_id: string } | null;
      if (result?.workspace_id) {
        await workspaceService.setCurrentWorkspace(result.workspace_id);
      }

      setStatus('success');
      setMessage('Successfully joined the workspace!');
      
      toast({
        title: "Welcome!",
        description: "You've successfully joined the workspace.",
      });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to accept invitation');
      
      toast({
        title: "Error",
        description: error.message || 'Failed to accept invitation',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Workspace Invitation</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processing your invitation...'}
            {status === 'success' && 'Invitation accepted!'}
            {status === 'error' && 'Something went wrong'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="text-center py-4">
              {status === 'success' ? (
                <>
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">{message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Redirecting to your workspace...
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">{message}</p>
                  <Button onClick={() => navigate('/')} variant="outline">
                    Go to Home
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
