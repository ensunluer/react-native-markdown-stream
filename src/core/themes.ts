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

export type ThemeMode = 'light' | 'dark';

export type MarkdownThemeConfig = {
  /**
   * Base palette to merge overrides on top of.
   * Defaults to the light theme.
   */
  base?: ThemeMode | MarkdownTheme;
  /**
   * Override individual theme tokens.
   */
  colors?: Partial<MarkdownTheme>;
} & Partial<MarkdownTheme>;

export type ThemePreference = ThemeMode | MarkdownTheme | MarkdownThemeConfig;

export const lightTheme: MarkdownTheme = {
  backgroundColor: 'transparent',
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
  backgroundColor: 'transparent',
  textColor: '#E5E7EB',
  mutedTextColor: '#9CA3AF',
  linkColor: '#60A5FA',
  codeBackgroundColor: '#1F2937',
  codeBorderColor: '#374151',
  codeTextColor: '#F9FAFB',
  quoteBorderColor: '#374151',
  quoteBackgroundColor: '#111827',
};

const THEME_KEYS: Array<keyof MarkdownTheme> = [
  'backgroundColor',
  'textColor',
  'mutedTextColor',
  'linkColor',
  'codeBackgroundColor',
  'codeBorderColor',
  'codeTextColor',
  'quoteBorderColor',
  'quoteBackgroundColor',
];

function isMarkdownTheme(value: unknown): value is MarkdownTheme {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return THEME_KEYS.every((key) => typeof (value as Record<string, unknown>)[key] === 'string');
}

function mergeThemes(base: MarkdownTheme, overrides?: Partial<MarkdownTheme>): MarkdownTheme {
  if (!overrides) {
    return { ...base };
  }

  const result: MarkdownTheme = { ...base };
  THEME_KEYS.forEach((key) => {
    if (overrides[key] != null) {
      result[key] = overrides[key] as string;
    }
  });
  return result;
}

function resolveBaseTheme(base: ThemeMode | MarkdownTheme | undefined): MarkdownTheme {
  if (!base) {
    return mergeThemes(lightTheme);
  }
  if (base === 'light') {
    return mergeThemes(lightTheme);
  }
  if (base === 'dark') {
    return mergeThemes(darkTheme);
  }

  return mergeThemes(lightTheme, base);
}

export function resolveTheme(theme: ThemePreference | undefined): MarkdownTheme {
  if (!theme) {
    return mergeThemes(lightTheme);
  }

  if (theme === 'light') {
    return mergeThemes(lightTheme);
  }

  if (theme === 'dark') {
    return mergeThemes(darkTheme);
  }

  if (isMarkdownTheme(theme)) {
    return mergeThemes(lightTheme, theme);
  }

  const { base, colors, ...directOverrides } = theme as MarkdownThemeConfig;
  const baseTheme = resolveBaseTheme(base);
  const combinedOverrides: Partial<MarkdownTheme> = {
    ...colors,
    ...directOverrides,
  };

  return mergeThemes(baseTheme, combinedOverrides);
}
