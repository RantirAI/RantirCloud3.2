/**
 * 5-Digit Sequential Numeric ID Generator
 * 
 * Generates unique 5-digit numeric IDs that:
 * - Start from a random base (10000-89999) for unpredictability
 * - Continue sequentially from the highest existing ID
 * 
 * Examples:
 * - First record: "34521" (random start)
 * - Second record: "34522" (sequential)
 * - Third record: "34523" (sequential)
 */

/**
 * Generate a unique 5-digit numeric record ID
 * 
 * @param recordOrExistingRecords - Either a single record (legacy) or array of existing records
 * @param schemaOrNothing - Optional schema (legacy, ignored)
 * @returns A unique 5-digit numeric ID string like "34521"
 * 
 * Examples:
 * - generateRecordId([]) → "34521" (random start)
 * - generateRecordId([{id: "34521"}]) → "34522" (sequential)
 * - generateRecordId([{id: "34521"}, {id: "34522"}]) → "34523"
 */
export function generateRecordId(
  recordOrExistingRecords?: Record<string, any> | any[],
  schemaOrNothing?: { fields: Array<{ name: string; type: string }> }
): string {
  // Determine if we're dealing with an array of existing records
  const existingRecords = Array.isArray(recordOrExistingRecords) 
    ? recordOrExistingRecords 
    : undefined;
  
  if (existingRecords && existingRecords.length > 0) {
    // Find the highest numeric ID and increment
    const numericIds = existingRecords
      .map(r => parseInt(r.id, 10))
      .filter(id => !isNaN(id) && id >= 10000 && id <= 99999);
    
    if (numericIds.length > 0) {
      const nextId = Math.max(...numericIds) + 1;
      return String(nextId);
    }
  }
  
  // No existing records or no valid IDs - generate random start between 10000-89999
  const randomStart = Math.floor(Math.random() * 80000) + 10000;
  return String(randomStart);
}

/**
 * Generate a record ID with a specific prefix (legacy support)
 * Now just generates a 5-digit numeric ID
 */
export function generateRecordIdWithPrefix(prefix: string): string {
  return generateRecordId();
}

/**
 * Check if a string looks like a generated record ID
 */
export function isGeneratedRecordId(id: string): boolean {
  // Matches 5-digit numeric IDs between 10000-99999
  const num = parseInt(id, 10);
  return !isNaN(num) && num >= 10000 && num <= 99999 && id === String(num);
}

/**
 * Generate realistic fake values based on field name context and type
 * Analyzes field names to determine appropriate data patterns
 */
export function generateFakeValue(field: { name: string; type: string; options?: string[] }, index: number): any {
  const { name, type, options } = field;
  const nameLower = name.toLowerCase();
  
  // ========== CHECK FIELD NAME FIRST (before type switch) ==========
  
  // SLUG - URL-friendly identifiers (high priority - often typed as text/textarea)
  if (nameLower === 'slug' || nameLower.includes('slug') || nameLower.includes('permalink')) {
    const slugs = ['alpha-series', 'beta-pro-edition', 'gamma-elite-v2', 'delta-max-ultra', 'epsilon-plus-x', 
                   'zeta-ultra-prime', 'theta-prime-pro', 'iota-core-lite', 'kappa-lite-mini', 'lambda-x-max'];
    return slugs[index % slugs.length];
  }
  
  // CONTENT - Article/blog content (high priority - often typed as textarea)
  if (nameLower === 'content' || nameLower.includes('body') || nameLower.includes('article')) {
    const contents = [
      'This comprehensive guide covers all essential aspects of the topic, providing valuable insights and detailed information for readers seeking to understand the fundamentals and advanced concepts.',
      'An in-depth exploration of the subject matter with practical examples, step-by-step instructions, and actionable advice for successful implementation in real-world scenarios.',
      'Detailed analysis that breaks down complex concepts into easy-to-understand sections, featuring clear explanations, visual aids, and expert recommendations.',
      'Expert commentary on current trends and best practices in the field, including case studies, industry insights, and proven strategies for achieving optimal results.',
      'Complete resource covering everything from basics to advanced techniques, with real-world applications, troubleshooting tips, and frequently asked questions addressed.'
    ];
    return contents[index % contents.length];
  }
  
  // EXCERPT - Short summaries (high priority - often typed as textarea)
  if (nameLower === 'excerpt' || nameLower.includes('summary') || nameLower.includes('intro') || nameLower.includes('preview')) {
    const excerpts = [
      'A comprehensive overview of key points and essential takeaways for quick understanding.',
      'Brief summary highlighting the most important aspects and core concepts covered.',
      'Short introduction to the topic with a preview of what readers can expect.',
      'Concise preview of the content, its value proposition, and main benefits.',
      'Quick look at the essential information and actionable insights provided.'
    ];
    return excerpts[index % excerpts.length];
  }
  
  // AUTHOR_ID, USER_ID, CREATED_BY etc. - Reference IDs
  if (nameLower.includes('author_id') || nameLower.includes('user_id') || nameLower.includes('created_by') || nameLower.includes('owner_id')) {
    return String(Math.floor(Math.random() * 900) + 100);
  }
  
  // AUTHOR name
  if (nameLower === 'author' || nameLower.includes('author_name') || nameLower.includes('writer')) {
    const authors = ['John Smith', 'Sarah Johnson', 'Michael Chen', 'Emily Davis', 'David Wilson', 
                     'Jessica Brown', 'Christopher Lee', 'Amanda Garcia', 'Daniel Martinez', 'Rachel Anderson'];
    return authors[index % authors.length];
  }
  
  // VIEWS, LIKES, SHARES - Engagement metrics
  if (nameLower === 'views' || nameLower === 'view_count' || nameLower.includes('pageviews')) {
    return Math.floor(Math.random() * 10000) + 100;
  }
  if (nameLower === 'likes' || nameLower === 'like_count' || nameLower.includes('upvotes')) {
    return Math.floor(Math.random() * 500) + 10;
  }
  if (nameLower === 'shares' || nameLower === 'share_count') {
    return Math.floor(Math.random() * 200) + 5;
  }
  if (nameLower === 'downloads' || nameLower === 'download_count') {
    return Math.floor(Math.random() * 5000) + 50;
  }
  if (nameLower === 'comments' || nameLower === 'comment_count') {
    return Math.floor(Math.random() * 100) + 1;
  }
  
  // IMAGE/MEDIA URLs
  if (nameLower.includes('image') || nameLower.includes('photo') || nameLower.includes('avatar') || nameLower.includes('thumbnail') || nameLower.includes('cover')) {
    return `https://picsum.photos/seed/${index + 1}/400/300`;
  }
  
  // TAG(S)
  if (nameLower === 'tags' || nameLower === 'tag') {
    const tagSets = [
      'technology, innovation, trends',
      'business, strategy, growth',
      'design, creativity, ux',
      'marketing, sales, conversion',
      'development, coding, programming'
    ];
    return tagSets[index % tagSets.length];
  }
  
  // PRIORITY
  if (nameLower === 'priority' || nameLower.includes('priority')) {
    const priorities = ['High', 'Medium', 'Low', 'Critical', 'Normal'];
    return priorities[index % priorities.length];
  }
  
  // ========== THEN FALL THROUGH TO TYPE-BASED LOGIC ==========
  
  switch (type) {
    case 'number':
      if (nameLower.includes('price') || nameLower.includes('cost') || nameLower.includes('amount')) {
        return Math.floor(Math.random() * 1000) + 99;
      }
      if (nameLower.includes('year') || nameLower.includes('release')) {
        return 2020 + Math.floor(Math.random() * 5);
      }
      if (nameLower.includes('quantity') || nameLower.includes('stock') || nameLower.includes('count')) {
        return Math.floor(Math.random() * 100) + 1;
      }
      if (nameLower.includes('rating') || nameLower.includes('score')) {
        return Math.floor(Math.random() * 5) + 1;
      }
      if (nameLower.includes('age')) {
        return Math.floor(Math.random() * 50) + 18;
      }
      return Math.floor(Math.random() * 1000) + 1;
      
    case 'boolean':
    case 'checkbox':
      return Math.random() > 0.3;
      
    case 'select':
      if (options && options.length > 0) {
        return options[Math.floor(Math.random() * options.length)];
      }
      return null;
      
    case 'multiselect':
      if (options && options.length > 0) {
        const numItems = Math.floor(Math.random() * 3) + 1;
        const shuffled = [...options].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(numItems, shuffled.length));
      }
      return [];
      
    case 'date':
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 365));
      return date.toISOString().split('T')[0];
      
    case 'timestamp':
      const ts = new Date();
      ts.setDate(ts.getDate() - Math.floor(Math.random() * 365));
      return ts.toISOString();
      
    case 'email':
      const firstNames = ['john', 'jane', 'mike', 'sarah', 'alex', 'emma', 'david', 'lisa', 'chris', 'anna'];
      const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'email.com'];
      return `${firstNames[index % firstNames.length]}${index + 1}@${domains[Math.floor(Math.random() * domains.length)]}`;
      
    case 'url':
      return `https://example.com/item-${index + 1}`;
      
    case 'textarea':
      const descriptions = [
        'Premium quality product with excellent features and outstanding performance.',
        'A reliable and durable item designed for everyday use.',
        'High-end product featuring cutting-edge technology and elegant design.',
        'Versatile and practical solution for modern consumers.',
        'Top-rated item with great reviews and customer satisfaction.'
      ];
      return descriptions[index % descriptions.length];
      
    default: // text and other types
      // Context-aware text generation based on field name
      if (nameLower.includes('brand')) {
        const brands = ['Apple', 'Samsung', 'Google', 'Sony', 'LG', 'Xiaomi', 'OnePlus', 'Nokia', 'Motorola', 'Huawei', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer'];
        return brands[index % brands.length];
      }
      if (nameLower.includes('model')) {
        const models = [
          'Pro Max 15', 'Galaxy S24 Ultra', 'Pixel 8 Pro', 'Xperia 1 V', 'G3 ThinQ',
          'Mi 14 Ultra', '12 Pro', 'Edge 40 Pro', 'Razr 40', 'Mate 60 Pro',
          'XPS 15', 'Spectre x360', 'ThinkPad X1', 'ZenBook Pro', 'Swift Go'
        ];
        return models[index % models.length];
      }
      if (nameLower.includes('name') && !nameLower.includes('brand')) {
        if (nameLower.includes('first') || nameLower.includes('user') || nameLower.includes('customer')) {
          const names = ['John', 'Jane', 'Michael', 'Sarah', 'Alex', 'Emma', 'David', 'Lisa', 'Chris', 'Anna'];
          return names[index % names.length];
        }
        if (nameLower.includes('last')) {
          const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
          return lastNames[index % lastNames.length];
        }
        if (nameLower.includes('product') || nameLower.includes('item')) {
          const products = ['Wireless Headphones', 'Smart Watch', 'Bluetooth Speaker', 'Laptop Stand', 'USB Hub', 'Mechanical Keyboard', 'Gaming Mouse', 'Webcam HD', 'Monitor Arm', 'Desk Lamp'];
          return products[index % products.length];
        }
        const genericNames = ['Alpha Series', 'Beta Pro', 'Gamma Elite', 'Delta Max', 'Epsilon Plus', 'Zeta Ultra', 'Theta Prime', 'Iota Core', 'Kappa Lite', 'Lambda X'];
        return genericNames[index % genericNames.length];
      }
      if (nameLower.includes('title')) {
        const titles = ['Premium Edition', 'Standard Package', 'Pro Bundle', 'Starter Kit', 'Ultimate Collection', 'Essential Set', 'Deluxe Version', 'Basic Plan', 'Advanced Suite', 'Complete Solution'];
        return titles[index % titles.length];
      }
      if (nameLower.includes('description') || nameLower.includes('desc')) {
        const descs = [
          'High-quality product with excellent features.',
          'Reliable and durable design for everyday use.',
          'Premium build with advanced technology.',
          'Versatile solution for modern needs.',
          'Top-rated with great customer reviews.'
        ];
        return descs[index % descs.length];
      }
      if (nameLower.includes('category') || nameLower.includes('type')) {
        const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Kitchen', 'Automotive', 'Health', 'Beauty'];
        return categories[index % categories.length];
      }
      if (nameLower.includes('status')) {
        const statuses = ['Active', 'Pending', 'Completed', 'In Progress', 'On Hold', 'Approved', 'Rejected', 'Draft', 'Published', 'Archived'];
        return statuses[index % statuses.length];
      }
      if (nameLower.includes('color') || nameLower.includes('colour')) {
        const colors = ['Midnight Black', 'Silver', 'Space Gray', 'Rose Gold', 'Pacific Blue', 'Graphite', 'Sierra Blue', 'Alpine Green', 'Purple', 'Starlight'];
        return colors[index % colors.length];
      }
      if (nameLower.includes('size')) {
        const sizes = ['Small', 'Medium', 'Large', 'XL', '128GB', '256GB', '512GB', '1TB', '14 inch', '16 inch'];
        return sizes[index % sizes.length];
      }
      if (nameLower.includes('address') || nameLower.includes('location')) {
        const addresses = [
          '123 Main Street, New York, NY',
          '456 Oak Avenue, Los Angeles, CA',
          '789 Pine Road, Chicago, IL',
          '321 Elm Boulevard, Houston, TX',
          '654 Maple Drive, Phoenix, AZ'
        ];
        return addresses[index % addresses.length];
      }
      if (nameLower.includes('phone') || nameLower.includes('tel') || nameLower.includes('mobile')) {
        return `+1 (555) ${String(100 + (index % 900)).padStart(3, '0')}-${String(1000 + index).padStart(4, '0')}`;
      }
      if (nameLower.includes('company') || nameLower.includes('org') || nameLower.includes('business')) {
        const companies = ['TechCorp Inc', 'Digital Solutions', 'Global Dynamics', 'Innovation Labs', 'Future Systems', 'Smart Tech', 'Elite Services', 'Prime Industries', 'Next Level Co', 'Apex Group'];
        return companies[index % companies.length];
      }
      if (nameLower.includes('country')) {
        const countries = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan', 'Australia', 'Brazil', 'India', 'Mexico'];
        return countries[index % countries.length];
      }
      if (nameLower.includes('city')) {
        const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'London', 'Tokyo', 'Paris', 'Sydney', 'Toronto'];
        return cities[index % cities.length];
      }
      if (nameLower.includes('sku') || nameLower.includes('code') || nameLower.includes('ref')) {
        return `SKU-${String(10000 + index).padStart(5, '0')}`;
      }
      // Default fallback
      return `Value ${index + 1}`;
  }
}
