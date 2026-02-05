export const personalEmailDomains = [
  '@gmail.com',
  '@yahoo.com',
  '@hotmail.',
  '@outlook.com',
  '@aol.com',
  '@icloud.com',
  '@live.com',
  '@protonmail.com',
  '@mail.com',
  '@example.com',
]

export const isValidEmail = (email: string): boolean => {
  const emailPattern = /^[\w-\.+]+@([\w-]+\.)+[\w-]{2,8}$/
  return emailPattern.test(email)
}

export const isCompanyEmail = (email: string): boolean => {
  for (const domain of personalEmailDomains) {
    if (email.includes(domain)) {
      return false
    }
  }
  return true
}
