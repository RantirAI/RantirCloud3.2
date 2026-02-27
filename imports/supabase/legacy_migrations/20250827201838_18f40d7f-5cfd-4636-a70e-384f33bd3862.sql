-- Enhance Kikoff Growth database schema and populate with substantial sample data for AI analysis

-- First, add additional fields to the table project schema for richer analysis
UPDATE public.table_projects 
SET schema = jsonb_set(
  schema,
  '{fields}',
  schema->'fields' || jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid(),
      'name', 'company',
      'type', 'text',
      'required', false,
      'description', 'Company name of the lead'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(),
      'name', 'industry',
      'type', 'select',
      'required', false,
      'options', jsonb_build_array(
        jsonb_build_object('label', 'Technology', 'value', 'technology'),
        jsonb_build_object('label', 'Healthcare', 'value', 'healthcare'),
        jsonb_build_object('label', 'Finance', 'value', 'finance'),
        jsonb_build_object('label', 'Education', 'value', 'education'),
        jsonb_build_object('label', 'Retail', 'value', 'retail'),
        jsonb_build_object('label', 'Manufacturing', 'value', 'manufacturing'),
        jsonb_build_object('label', 'Consulting', 'value', 'consulting'),
        jsonb_build_object('label', 'Real Estate', 'value', 'real_estate'),
        jsonb_build_object('label', 'Marketing', 'value', 'marketing'),
        jsonb_build_object('label', 'Other', 'value', 'other')
      ),
      'description', 'Industry sector'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(),
      'name', 'location',
      'type', 'text',
      'required', false,
      'description', 'Geographic location'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(),
      'name', 'lead_source',
      'type', 'select',
      'required', false,
      'options', jsonb_build_array(
        jsonb_build_object('label', 'Website', 'value', 'website'),
        jsonb_build_object('label', 'Social Media', 'value', 'social_media'),
        jsonb_build_object('label', 'Email Campaign', 'value', 'email_campaign'),
        jsonb_build_object('label', 'Referral', 'value', 'referral'),
        jsonb_build_object('label', 'Advertisement', 'value', 'advertisement'),
        jsonb_build_object('label', 'Webinar', 'value', 'webinar'),
        jsonb_build_object('label', 'Trade Show', 'value', 'trade_show')
      ),
      'description', 'Source of the lead'
    )
  ),
  updated_at = now()
)
WHERE user_id = '4ba7d3dc-8bf4-4a88-9f98-c1df57e09020' 
  AND name = 'Kikoff App Landing Test 1 landing page';

-- Now populate with substantial sample records
UPDATE public.table_projects 
SET records = jsonb_build_array(
  -- Tech industry leads
  jsonb_build_object('id', gen_random_uuid(), 'email', 'sarah.chen@techstartup.io', 'firstName', 'Sarah', 'company', 'TechStartup Inc', 'industry', 'technology', 'location', 'San Francisco, CA', 'lead_source', 'website', 'created_at', '2024-01-15T09:30:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'michael.rodriguez@devcode.com', 'firstName', 'Michael', 'company', 'DevCode Solutions', 'industry', 'technology', 'location', 'Austin, TX', 'lead_source', 'social_media', 'created_at', '2024-01-18T14:22:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'emily.wang@aitech.net', 'firstName', 'Emily', 'company', 'AI Tech Labs', 'industry', 'technology', 'location', 'Seattle, WA', 'lead_source', 'webinar', 'created_at', '2024-01-22T11:45:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'david.kim@cloudnative.dev', 'firstName', 'David', 'company', 'CloudNative Corp', 'industry', 'technology', 'location', 'New York, NY', 'lead_source', 'referral', 'created_at', '2024-01-25T16:10:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'jessica.patel@mobiledev.co', 'firstName', 'Jessica', 'company', 'Mobile Dev Co', 'industry', 'technology', 'location', 'Los Angeles, CA', 'lead_source', 'advertisement', 'created_at', '2024-01-28T10:33:00Z'),
  
  -- Healthcare leads
  jsonb_build_object('id', gen_random_uuid(), 'email', 'dr.james.smith@healthplus.org', 'firstName', 'James', 'company', 'HealthPlus Medical', 'industry', 'healthcare', 'location', 'Chicago, IL', 'lead_source', 'email_campaign', 'created_at', '2024-02-02T08:15:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'maria.gonzalez@wellness.clinic', 'firstName', 'Maria', 'company', 'Wellness Clinic Network', 'industry', 'healthcare', 'location', 'Miami, FL', 'lead_source', 'website', 'created_at', '2024-02-05T13:20:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'robert.johnson@medtech.solutions', 'firstName', 'Robert', 'company', 'MedTech Solutions', 'industry', 'healthcare', 'location', 'Boston, MA', 'lead_source', 'trade_show', 'created_at', '2024-02-08T09:45:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'lisa.anderson@pharma.research', 'firstName', 'Lisa', 'company', 'Pharma Research Inc', 'industry', 'healthcare', 'location', 'Philadelphia, PA', 'lead_source', 'webinar', 'created_at', '2024-02-12T15:30:00Z'),
  
  -- Finance leads
  jsonb_build_object('id', gen_random_uuid(), 'email', 'alex.thompson@fintech.capital', 'firstName', 'Alex', 'company', 'FinTech Capital', 'industry', 'finance', 'location', 'San Francisco, CA', 'lead_source', 'social_media', 'created_at', '2024-02-15T11:25:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'jennifer.lee@investment.group', 'firstName', 'Jennifer', 'company', 'Investment Group LLC', 'industry', 'finance', 'location', 'New York, NY', 'lead_source', 'referral', 'created_at', '2024-02-18T14:10:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'thomas.brown@creditunion.coop', 'firstName', 'Thomas', 'company', 'Community Credit Union', 'industry', 'finance', 'location', 'Denver, CO', 'lead_source', 'website', 'created_at', '2024-02-22T10:55:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'rachel.davis@wealth.management', 'firstName', 'Rachel', 'company', 'Wealth Management Pro', 'industry', 'finance', 'location', 'Charlotte, NC', 'lead_source', 'email_campaign', 'created_at', '2024-02-25T16:40:00Z'),
  
  -- Education leads
  jsonb_build_object('id', gen_random_uuid(), 'email', 'prof.william.taylor@university.edu', 'firstName', 'William', 'company', 'State University', 'industry', 'education', 'location', 'Ann Arbor, MI', 'lead_source', 'webinar', 'created_at', '2024-03-01T09:20:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'susan.miller@online.academy', 'firstName', 'Susan', 'company', 'Online Learning Academy', 'industry', 'education', 'location', 'Phoenix, AZ', 'lead_source', 'advertisement', 'created_at', '2024-03-05T13:15:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'kevin.wilson@training.institute', 'firstName', 'Kevin', 'company', 'Professional Training Institute', 'industry', 'education', 'location', 'Atlanta, GA', 'lead_source', 'social_media', 'created_at', '2024-03-08T11:30:00Z'),
  
  -- Retail leads
  jsonb_build_object('id', gen_random_uuid(), 'email', 'natalie.moore@retail.chain', 'firstName', 'Natalie', 'company', 'Retail Chain Corp', 'industry', 'retail', 'location', 'Minneapolis, MN', 'lead_source', 'trade_show', 'created_at', '2024-03-12T14:45:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'christopher.clark@ecommerce.store', 'firstName', 'Christopher', 'company', 'E-commerce Store', 'industry', 'retail', 'location', 'Portland, OR', 'lead_source', 'website', 'created_at', '2024-03-15T10:20:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'amanda.white@fashion.boutique', 'firstName', 'Amanda', 'company', 'Fashion Boutique Inc', 'industry', 'retail', 'location', 'Nashville, TN', 'lead_source', 'social_media', 'created_at', '2024-03-18T15:55:00Z'),
  
  -- Manufacturing leads
  jsonb_build_object('id', gen_random_uuid(), 'email', 'joseph.harris@manufacturing.corp', 'firstName', 'Joseph', 'company', 'Manufacturing Corp', 'industry', 'manufacturing', 'location', 'Detroit, MI', 'lead_source', 'email_campaign', 'created_at', '2024-03-22T08:35:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'stephanie.martin@industrial.solutions', 'firstName', 'Stephanie', 'company', 'Industrial Solutions LLC', 'industry', 'manufacturing', 'location', 'Cleveland, OH', 'lead_source', 'referral', 'created_at', '2024-03-25T12:10:00Z'),
  
  -- More diverse leads for better analysis
  jsonb_build_object('id', gen_random_uuid(), 'email', 'carlos.rivera@consulting.pro', 'firstName', 'Carlos', 'company', 'Pro Consulting Group', 'industry', 'consulting', 'location', 'Dallas, TX', 'lead_source', 'webinar', 'created_at', '2024-04-01T09:15:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'angela.garcia@marketing.agency', 'firstName', 'Angela', 'company', 'Digital Marketing Agency', 'industry', 'marketing', 'location', 'Las Vegas, NV', 'lead_source', 'advertisement', 'created_at', '2024-04-05T14:30:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'brian.lewis@realestate.firm', 'firstName', 'Brian', 'company', 'Premier Real Estate', 'industry', 'real_estate', 'location', 'Orlando, FL', 'lead_source', 'social_media', 'created_at', '2024-04-08T11:45:00Z'),
  
  -- International leads
  jsonb_build_object('id', gen_random_uuid(), 'email', 'elena.petrov@tech.startup.ru', 'firstName', 'Elena', 'company', 'Tech Startup Moscow', 'industry', 'technology', 'location', 'Moscow, Russia', 'lead_source', 'website', 'created_at', '2024-04-12T07:20:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'hans.mueller@engineering.de', 'firstName', 'Hans', 'company', 'Engineering Solutions GmbH', 'industry', 'manufacturing', 'location', 'Berlin, Germany', 'lead_source', 'trade_show', 'created_at', '2024-04-15T16:10:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'yuki.tanaka@innovation.jp', 'firstName', 'Yuki', 'company', 'Innovation Labs Tokyo', 'industry', 'technology', 'location', 'Tokyo, Japan', 'lead_source', 'webinar', 'created_at', '2024-04-18T13:25:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'pierre.dubois@fintech.fr', 'firstName', 'Pierre', 'company', 'FinTech Paris', 'industry', 'finance', 'location', 'Paris, France', 'lead_source', 'email_campaign', 'created_at', '2024-04-22T10:40:00Z'),
  
  -- Recent leads for trend analysis
  jsonb_build_object('id', gen_random_uuid(), 'email', 'olivia.jackson@healthtech.startup', 'firstName', 'Olivia', 'company', 'HealthTech Startup', 'industry', 'healthcare', 'location', 'San Diego, CA', 'lead_source', 'social_media', 'created_at', '2024-05-01T09:30:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'daniel.kim@edtech.platform', 'firstName', 'Daniel', 'company', 'EdTech Platform', 'industry', 'education', 'location', 'San Jose, CA', 'lead_source', 'advertisement', 'created_at', '2024-05-05T14:15:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'sophie.anderson@retail.innovation', 'firstName', 'Sophie', 'company', 'Retail Innovation Co', 'industry', 'retail', 'location', 'Salt Lake City, UT', 'lead_source', 'referral', 'created_at', '2024-05-08T11:50:00Z'),
  
  -- Weekend and evening leads for temporal analysis
  jsonb_build_object('id', gen_random_uuid(), 'email', 'marcus.johnson@weekend.startup', 'firstName', 'Marcus', 'company', 'Weekend Startup', 'industry', 'technology', 'location', 'Austin, TX', 'lead_source', 'website', 'created_at', '2024-05-11T19:45:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'isabella.rodriguez@evening.consulting', 'firstName', 'Isabella', 'company', 'Evening Consulting', 'industry', 'consulting', 'location', 'Houston, TX', 'lead_source', 'social_media', 'created_at', '2024-05-12T21:30:00Z'),
  
  -- Government and non-profit
  jsonb_build_object('id', gen_random_uuid(), 'email', 'john.smith@city.gov', 'firstName', 'John', 'company', 'City Government', 'industry', 'other', 'location', 'Sacramento, CA', 'lead_source', 'email_campaign', 'created_at', '2024-05-15T08:15:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'mary.johnson@nonprofit.org', 'firstName', 'Mary', 'company', 'Community Nonprofit', 'industry', 'other', 'location', 'Portland, ME', 'lead_source', 'webinar', 'created_at', '2024-05-18T12:40:00Z'),
  
  -- Diverse email domains
  jsonb_build_object('id', gen_random_uuid(), 'email', 'alex.startup@gmail.com', 'firstName', 'Alex', 'company', 'Freelance Consultant', 'industry', 'consulting', 'location', 'Remote', 'lead_source', 'social_media', 'created_at', '2024-05-20T15:20:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'sarah.entrepreneur@yahoo.com', 'firstName', 'Sarah', 'company', 'Solo Business', 'industry', 'other', 'location', 'Tampa, FL', 'lead_source', 'website', 'created_at', '2024-05-22T09:55:00Z'),
  jsonb_build_object('id', gen_random_uuid(), 'email', 'mike.freelancer@outlook.com', 'firstName', 'Mike', 'company', 'Independent Contractor', 'industry', 'marketing', 'location', 'Kansas City, MO', 'lead_source', 'referral', 'created_at', '2024-05-25T13:10:00Z')
),
updated_at = now()
WHERE user_id = '4ba7d3dc-8bf4-4a88-9f98-c1df57e09020' 
  AND name = 'Kikoff App Landing Test 1 landing page';