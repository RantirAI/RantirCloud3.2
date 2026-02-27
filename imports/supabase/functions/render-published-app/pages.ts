/**
 * Generate password protection page
 */
export function generatePasswordPage(subdomain: string, appName?: string, error?: string): string {
  const title = appName || subdomain;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Required - ${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .glass { backdrop-filter: blur(16px); background: rgba(255,255,255,0.8); }
  </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
  <div class="glass rounded-2xl shadow-2xl p-8 max-w-md w-full">
    <div class="text-center mb-8">
      <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-900">${title}</h1>
      <p class="text-gray-600 mt-2">This app is password protected</p>
      ${error ? `<p class="mt-3 text-red-600 text-sm font-medium">${error}</p>` : ''}
    </div>
    <form onsubmit="handleSubmit(event)" class="space-y-4">
      <div>
        <input 
          id="password" 
          name="password" 
          type="password" 
          required 
          autofocus
          class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
          placeholder="Enter password"
        >
      </div>
      <button 
        type="submit" 
        class="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all"
      >
        Access App
      </button>
    </form>
    <p class="text-center text-gray-500 text-xs mt-6">
      Powered by <a href="https://rantir.com" class="text-purple-600 hover:text-purple-700">Rantir</a>
    </p>
  </div>
  <script>
    function handleSubmit(event) {
      event.preventDefault();
      const password = document.getElementById('password').value;
      const url = new URL(window.location);
      url.searchParams.set('password', password);
      window.location.href = url.toString();
    }
  </script>
</body>
</html>`;
}

/**
 * Generate error page
 */
export function generateErrorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Rantir</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
  <div class="text-center">
    <div class="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg class="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
    </div>
    <h1 class="text-3xl font-bold text-white mb-3">${title}</h1>
    <p class="text-gray-400 mb-8 max-w-md">${message}</p>
    <a href="https://rantir.com" class="inline-flex items-center px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors">
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
      </svg>
      Go to Rantir
    </a>
  </div>
</body>
</html>`;
}
