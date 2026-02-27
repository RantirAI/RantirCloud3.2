import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { workspaceId, email, role } = await req.json();

    if (!workspaceId || !email || !role) {
      throw new Error('Missing required fields: workspaceId, email, role');
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Sending invitation from user:', user.id, 'to email:', email);

    // Check if user is owner of the workspace OR is admin/enterprise member
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from('workspaces')
      .select('name, user_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      throw new Error('Workspace not found');
    }

    // Check if user is the workspace owner
    const isOwner = workspace.user_id === user.id;
    
    // If not owner, check if they're an admin in the workspace
    if (!isOwner) {
      const { data: membership } = await supabaseClient
        .from('workspace_members')
        .select('role, user_group')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new Error('Only workspace owners and admins can invite members');
      }
    }

    // Create (or re-issue) invitation for this email.
    // NOTE: This table appears to have a unique constraint on (workspace_id, email),
    // so we upsert and always generate a fresh token + expiry.
    const tokenValue = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error: invitationError } = await supabaseClient
      .from('workspace_invitations')
      .upsert(
        {
          workspace_id: workspaceId,
          email,
          role,
          invited_by: user.id,
          status: 'pending',
          token: tokenValue,
          expires_at: expiresAt,
        },
        { onConflict: 'workspace_id,email' }
      )
      .select()
      .single();

    if (invitationError) {
      console.error('Failed to create/update invitation:', invitationError);
      throw invitationError;
    }

    console.log('Upserted invitation:', invitation.id, 'status:', invitation.status, 'expires_at:', invitation.expires_at);

    console.log('Created invitation:', invitation.id);

    // Construct invitation link using the app's domain
    const appUrl = Deno.env.get('APP_URL') || 'https://rantir-cloud-2-1.lovable.app';
    const inviteUrl = `${appUrl}/accept-invitation?token=${invitation.token}`;

    console.log('Invitation link:', inviteUrl);

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let emailSent = false;
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const { error: emailError } = await resend.emails.send({
          from: 'Rantir <invites@rantir.app>',
          to: [email],
          subject: `You've been invited to join ${workspace.name}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #ffffff;">
                <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff;">
                  <!-- Header -->
                  <div style="background-color: #1a1a1a; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" style="vertical-align: middle;">
                          <div style="width: 36px; height: 36px; background-color: #000000; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid #333;">
                            <span style="color: #ffffff; font-size: 18px; font-weight: bold;">R</span>
                          </div>
                        </td>
                        <td style="text-align: center; vertical-align: middle;">
                          <span style="color: #999999; font-size: 14px;">Rantir Cloud</span>
                          <span style="display: inline-block; background-color: #ffffff; color: #000000; font-size: 11px; font-weight: 600; padding: 6px 12px; border-radius: 20px; margin-left: 8px;">Data. Logic. Builder.</span>
                        </td>
                        <td width="40"></td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 48px 32px; text-align: center;">
                    <h1 style="color: #000000; margin: 0 0 32px 0; font-size: 24px; font-weight: 600;">Workspace Invitation</h1>
                    
                    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px; text-align: left;">
                      You've been invited to join <strong>${workspace.name}</strong> as a <strong>${role}</strong>
                    </p>
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 32px; text-align: left;">
                      Click the button below to accept the invitation and get started. If you don't have an account, you'll be prompted to create one.
                    </p>
                    
                    <!-- Button -->
                    <a href="${inviteUrl}" style="display: block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 500; font-size: 15px; text-align: center;">
                      Accept Invitation
                    </a>
                    
                    <p style="color: #9ca3af; font-size: 13px; margin-top: 32px;">
                      This invitation will expire in 7 days.
                    </p>
                    
                    <p style="color: #9ca3af; font-size: 13px; margin-top: 8px;">
                      If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                    
                    <p style="color: #374151; font-size: 13px; margin-top: 24px;">
                      Please go to <a href="https://rantir.com/support" style="color: #374151; text-decoration: none;">Rantir.com/support</a> for workspace or login questions
                    </p>
                  </div>
                  
                  <!-- Footer Logo -->
                  <div style="padding: 24px 32px 48px; text-align: center;">
                    <span style="color: #9ca3af; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Rantir</span>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        if (emailError) {
          console.error('Failed to send email:', emailError);
        } else {
          emailSent = true;
          console.log('Invitation email sent successfully');
        }
      } catch (emailErr) {
        console.error('Error sending email:', emailErr);
      }
    } else {
      console.log('RESEND_API_KEY not configured, skipping email send');
    }

    // Log audit event
    await supabaseClient
      .from('enterprise_audit')
      .insert({
        workspace_id: workspaceId,
        actor_id: user.id,
        action: 'invitation_sent',
        details: { email, role, invitation_id: invitation.id, email_sent: emailSent },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent ? 'Invitation sent successfully' : 'Invitation created (email not sent - copy the link)',
        invitationLink: inviteUrl,
        invitationId: invitation.id,
        emailSent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
