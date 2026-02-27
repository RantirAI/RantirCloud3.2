import { corsHeaders } from '../_shared/cors.ts';

// CyberArk Identity SCIM API for user and group management
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      action,
      baseUrl,
      apiToken,
      // User fields
      userId,
      userName,
      displayName,
      givenName,
      familyName,
      email,
      active,
      filterQuery,
      // Group fields
      groupId,
      memberId,
    } = body;

    console.log('CyberArk proxy called with action:', action);

    if (!baseUrl) throw new Error('CyberArk base URL is required');
    if (!apiToken) throw new Error('API token is required');

    const apiBase = baseUrl.replace(/\/$/, '');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
    };

    // Helper for SCIM API calls
    const scimCall = async (url: string, method: string, payload?: any) => {
      const opts: RequestInit = { method, headers };
      if (payload && ['POST', 'PUT', 'PATCH'].includes(method)) {
        opts.body = JSON.stringify(payload);
      }
      const response = await fetch(url, opts);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`CyberArk SCIM error [${response.status}]: ${errorText}`);
      }
      if (response.status === 204) return { success: true };
      return await response.json();
    };

    let result: Record<string, any> = { success: true, error: null };

    switch (action) {
      case 'createUser': {
        if (!userName) throw new Error('Username is required');

        console.log('Creating SCIM user:', userName);

        const scimUser: Record<string, any> = {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName,
          active: active !== false,
        };

        if (displayName) scimUser.displayName = displayName;
        if (givenName || familyName) {
          scimUser.name = {};
          if (givenName) scimUser.name.givenName = givenName;
          if (familyName) scimUser.name.familyName = familyName;
        }
        if (email) {
          scimUser.emails = [{ value: email, type: 'work', primary: true }];
        }

        result.data = await scimCall(`${apiBase}/scim/Users`, 'POST', scimUser);
        break;
      }

      case 'updateUser': {
        if (!userId) throw new Error('User ID is required');

        console.log('Updating SCIM user:', userId);

        const scimUser: Record<string, any> = {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        };

        if (userName) scimUser.userName = userName;
        if (displayName) scimUser.displayName = displayName;
        if (givenName || familyName) {
          scimUser.name = {};
          if (givenName) scimUser.name.givenName = givenName;
          if (familyName) scimUser.name.familyName = familyName;
        }
        if (email) {
          scimUser.emails = [{ value: email, type: 'work', primary: true }];
        }
        if (active !== undefined) scimUser.active = active;

        result.data = await scimCall(`${apiBase}/scim/Users/${userId}`, 'PUT', scimUser);
        break;
      }

      case 'deleteUser': {
        if (!userId) throw new Error('User ID is required');

        console.log('Deleting SCIM user:', userId);
        result.data = await scimCall(`${apiBase}/scim/Users/${userId}`, 'DELETE');
        result.data = { deleted: true, userId };
        break;
      }

      case 'activateUser':
      case 'enableUser': {
        if (!userId) throw new Error('User ID is required');

        console.log('Activating user:', userId);
        const patchPayload = {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [{ op: 'replace', path: 'active', value: true }],
        };
        result.data = await scimCall(`${apiBase}/scim/Users/${userId}`, 'PATCH', patchPayload);
        break;
      }

      case 'disableUser': {
        if (!userId) throw new Error('User ID is required');

        console.log('Disabling user:', userId);
        const patchPayload = {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [{ op: 'replace', path: 'active', value: false }],
        };
        result.data = await scimCall(`${apiBase}/scim/Users/${userId}`, 'PATCH', patchPayload);
        break;
      }

      case 'findUser': {
        console.log('Finding SCIM users');

        let url = `${apiBase}/scim/Users`;
        if (filterQuery) {
          url += `?filter=${encodeURIComponent(filterQuery)}`;
        } else if (userName) {
          url += `?filter=${encodeURIComponent(`userName eq "${userName}"`)}`;
        } else if (email) {
          url += `?filter=${encodeURIComponent(`emails.value eq "${email}"`)}`;
        }

        result.data = await scimCall(url, 'GET');
        break;
      }

      case 'addMemberToGroup': {
        if (!groupId) throw new Error('Group ID is required');
        if (!memberId) throw new Error('Member ID is required');

        console.log('Adding member', memberId, 'to group', groupId);
        const patchPayload = {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [{
            op: 'add',
            path: 'members',
            value: [{ value: memberId }],
          }],
        };
        result.data = await scimCall(`${apiBase}/scim/Groups/${groupId}`, 'PATCH', patchPayload);
        break;
      }

      case 'removeMemberFromGroup': {
        if (!groupId) throw new Error('Group ID is required');
        if (!memberId) throw new Error('Member ID is required');

        console.log('Removing member', memberId, 'from group', groupId);
        const patchPayload = {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [{
            op: 'remove',
            path: `members[value eq "${memberId}"]`,
          }],
        };
        result.data = await scimCall(`${apiBase}/scim/Groups/${groupId}`, 'PATCH', patchPayload);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('CyberArk operation successful');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('CyberArk proxy error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
