export const fonts = {
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  playfair: {
    regular: 'PlayfairDisplay_400Regular',
    bold: 'PlayfairDisplay_700Bold',
  },
  mono: {
    regular: 'JetBrainsMono_400Regular', // fallback to monospace if missing
    medium: 'JetBrainsMono_500Medium',
    semiBold: 'JetBrainsMono_600SemiBold',
    bold: 'JetBrainsMono_700Bold',
  }
};

export const typography = {
  h1: {
    fontFamily: fonts.playfair.bold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fonts.playfair.bold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  h3: {
    fontFamily: fonts.inter.bold,
    fontSize: 20,
    lineHeight: 28,
  },
  h4: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.inter.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: fonts.inter.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontFamily: fonts.inter.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: fonts.inter.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  mono: {
    fontFamily: 'monospace', // Simple fallback for now
    fontSize: 14,
    lineHeight: 20,
  }
};
