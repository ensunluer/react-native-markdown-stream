export interface MarkdownTheme {
  backgroundColor: string;
  textColor: string;
  mutedTextColor: string;
  linkColor: string;
  codeBackgroundColor: string;
  codeBorderColor: string;
  codeTextColor: string;
  quoteBorderColor: string;
  quoteBackgroundColor: string;
}

export const lightTheme: MarkdownTheme = {
  backgroundColor: '#FFFFFF',
  textColor: '#1F2933',
  mutedTextColor: '#52606D',
  linkColor: '#2563EB',
  codeBackgroundColor: '#F3F4F6',
  codeBorderColor: '#E5E7EB',
  codeTextColor: '#111827',
  quoteBorderColor: '#D1D5DB',
  quoteBackgroundColor: '#F9FAFB',
};

export const darkTheme: MarkdownTheme = {
  backgroundColor: '#0B1120',
  textColor: '#E5E7EB',
  mutedTextColor: '#9CA3AF',
  linkColor: '#60A5FA',
  codeBackgroundColor: '#1F2937',
  codeBorderColor: '#374151',
  codeTextColor: '#F9FAFB',
  quoteBorderColor: '#374151',
  quoteBackgroundColor: '#111827',
};

export type ThemePreference = 'light' | 'dark' | MarkdownTheme;

export function resolveTheme(theme: ThemePreference | undefined): MarkdownTheme {
  if (!theme) {
    return lightTheme;
  }
  if (theme === 'light') {
    return lightTheme;
  }
  if (theme === 'dark') {
    return darkTheme;
  }
  return theme;
}
