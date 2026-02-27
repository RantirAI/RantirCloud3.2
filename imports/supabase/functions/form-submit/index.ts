
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'
import { corsHeaders } from '../_shared/cors.ts'
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Generate 5-digit sequential numeric ID
function generateRecordId(existingRecords?: any[]): string {
  if (existingRecords && existingRecords.length > 0) {
    const numericIds = existingRecords
      .map(r => parseInt(r.id, 10))
      .filter(id => !isNaN(id) && id >= 10000 && id <= 99999);
    
    if (numericIds.length > 0) {
      return String(Math.max(...numericIds) + 1);
    }
  }
  // Random start between 10000-89999 for first record
  return String(Math.floor(Math.random() * 80000) + 10000);
}

// Secure password hashing using bcrypt
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

// Password verification with bcrypt, with fallback for legacy SHA-256 hashes
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (storedHash.startsWith('$2')) {
    return await bcrypt.compare(password, storedHash);
  }
  // Legacy SHA-256 fallback (64 hex chars)
  if (storedHash.length === 64 && /^[0-9a-f]+$/.test(storedHash)) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return sha256Hash === storedHash;
  }
  return false;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const tableId = pathSegments[pathSegments.length - 1]
    const mode = url.searchParams.get('mode')

    if (!tableId) {
      return new Response(
        JSON.stringify({ error: 'Table ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()

    // Get the table project
    const { data: tableProject, error: tableError } = await supabase
      .from('table_projects')
      .select('*')
      .eq('id', tableId)
      .single()

    if (tableError || !tableProject) {
      return new Response(
        JSON.stringify({ error: 'Table not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const records = Array.isArray(tableProject.records) ? tableProject.records : []
    const schema = tableProject.schema

    if (mode === 'check') {
      // Check if user exists (for login)
      const emailField = schema.fields.find((f: any) => f.type === 'email')
      const passwordField = schema.fields.find((f: any) => f.type === 'password')

      if (!emailField || !passwordField) {
        return new Response(
          JSON.stringify({ error: 'Email and password fields required for login' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const email = body[emailField.name]
      const password = body[passwordField.name]

      if (!email || !password) {
        return new Response(
          JSON.stringify({ exists: false }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Find user by email
      const existingUser = records.find((record: any) => {
        const userEmail = record[emailField.id] || record[emailField.name]
        return userEmail && userEmail.toLowerCase() === email.toLowerCase()
      })

      if (existingUser) {
        // Verify password hash
        const storedPasswordHash = existingUser[passwordField.id] || existingUser[passwordField.name]
        const isPasswordValid = await verifyPassword(password, storedPasswordHash)
        
        if (!isPasswordValid) {
          return new Response(
            JSON.stringify({ exists: false }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        
        // Convert field IDs back to field names for easier consumption
        const userData: any = { email };
        schema.fields.forEach((field: any) => {
          if (field.type !== 'password' && existingUser[field.id] !== undefined) {
            userData[field.name] = existingUser[field.id];
          }
        });
        
        return new Response(
          JSON.stringify({ 
            exists: true, 
            user: userData,
            userId: existingUser.id,
            createdAt: existingUser.createdAt || existingUser.created_at
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ exists: false }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else if (mode === 'submit') {
      // General form submission (not user registration)
      const existingRecords = records || [];
      const newRecord: any = {
        id: generateRecordId(existingRecords),
        type: 'form-submission',
        submittedAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...body
      }

      // Convert field names to field IDs for storage
      const recordForStorage: any = { id: newRecord.id }
      
      // Create mapping from field name to field ID
      const fieldNameToIdMap: { [key: string]: string } = {}
      schema.fields.forEach((field: any) => {
        fieldNameToIdMap[field.name] = field.id
      })

      // Convert data to use field IDs
      Object.keys(newRecord).forEach(key => {
        if (key === 'id') {
          recordForStorage.id = newRecord.id
        } else if (fieldNameToIdMap[key]) {
          recordForStorage[fieldNameToIdMap[key]] = newRecord[key]
        } else {
          recordForStorage[key] = newRecord[key]
        }
      })

      const updatedRecords = [...records, recordForStorage]

      // Update the table project with new record
      const { error: updateError } = await supabase
        .from('table_projects')
        .update({ records: updatedRecords })
        .eq('id', tableId)

      if (updateError) {
        console.error('Error updating table:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to save record' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ success: true, id: newRecord.id }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      // Create new user (registration) - ONLY when explicitly signing up
      const url = new URL(req.url)
      const planId = url.searchParams.get('planId')
      const isActualSignup = url.searchParams.get('signup') === 'true'

      // Prevent accidental record creation from embed copying
      if (!isActualSignup) {
        return new Response(
          JSON.stringify({ error: 'Invalid signup request' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Check for duplicate email before creating account
      const emailField = schema.fields.find((f: any) => f.type === 'email')
      const passwordField = schema.fields.find((f: any) => f.type === 'password')
      
      if (emailField) {
        const email = body[emailField.name]
        if (email) {
          const existingUser = records.find((record: any) => {
            const userEmail = record[emailField.id] || record[emailField.name]
            return userEmail && userEmail.toLowerCase() === email.toLowerCase()
          })
          
          if (existingUser) {
            return new Response(
              JSON.stringify({ error: 'Account already exists with this email address' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
        }
      }

      let selectedPlan = null

      // If planId and tableId are provided, validate the plan
      if (planId && tableId) {
        try {
          // Validate plan exists and is available
          const planValidationResponse = await fetch(
            `${supabaseUrl}/functions/v1/validate-plan?planId=${encodeURIComponent(planId)}&tableId=${encodeURIComponent(tableId)}`,
            {
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`
              }
            }
          )
          
          const validationData = await planValidationResponse.json()
          
          if (validationData.valid && validationData.plan) {
            selectedPlan = {
              id: validationData.plan.id,
              name: validationData.plan.name,
              description: validationData.plan.description,
              price: validationData.plan.price,
              billingPeriod: validationData.plan.billingPeriod,
              validated: true,
              validatedAt: new Date().toISOString()
            }
          }
        } catch (error) {
          console.error('Plan validation failed:', error)
          // Continue with registration but mark plan as invalid
          selectedPlan = {
            id: planId,
            validated: false,
            error: 'Plan validation failed',
            validatedAt: new Date().toISOString()
          }
        }
      }

      // Hash password before storing
      const processedBody = { ...body }
      if (passwordField && body[passwordField.name]) {
        processedBody[passwordField.name] = await hashPassword(body[passwordField.name])
      }

      const existingRecords = records || [];
      const newRecord: any = {
        id: generateRecordId(existingRecords),
        type: 'user-registration',
        signupSource: 'form',
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Add plan information if provided
        selectedPlan: selectedPlan,
        ...processedBody
      }

      // Convert field names to field IDs for storage
      const recordForStorage: any = { id: newRecord.id }
      
      // Create mapping from field name to field ID
      const fieldNameToIdMap: { [key: string]: string } = {}
      schema.fields.forEach((field: any) => {
        fieldNameToIdMap[field.name] = field.id
      })

      // Convert data to use field IDs
      Object.keys(newRecord).forEach(key => {
        if (key === 'id') {
          recordForStorage.id = newRecord.id
        } else if (key === 'selectedPlan') {
          // Find selectedPlan field ID or use key if not found
          const selectedPlanFieldId = schema.fields.find((field: any) => field.name === 'selectedPlan')?.id
          if (selectedPlanFieldId) {
            recordForStorage[selectedPlanFieldId] = newRecord[key]
          } else {
            recordForStorage[key] = newRecord[key]
          }
        } else if (fieldNameToIdMap[key]) {
          recordForStorage[fieldNameToIdMap[key]] = newRecord[key]
        } else {
          recordForStorage[key] = newRecord[key]
        }
      })

      const updatedRecords = [...records, recordForStorage]

      // Update the table project with new record
      const { error: updateError } = await supabase
        .from('table_projects')
        .update({ records: updatedRecords })
        .eq('id', tableId)

      if (updateError) {
        console.error('Error updating table:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to save record' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ success: true, id: newRecord.id }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
