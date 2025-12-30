/**
 * Converts Western Arabic numerals (0-9) to Eastern Arabic numerals (٠-٩)
 * @param num - The number or string to convert
 * @param isArabic - Whether the current language is Arabic
 * @returns The converted number as a string
 */
export const toArabicNumerals = (num: number | string, isArabic: boolean): string => {
  if (!isArabic) {
    return String(num);
  }

  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const numStr = String(num);
  
  return numStr.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit, 10)]);
};

/**
 * Formats a number with Arabic numerals if the language is Arabic
 * @param num - The number to format
 * @param isArabic - Whether the current language is Arabic
 * @param options - Optional formatting options (e.g., minimum digits)
 * @returns The formatted number as a string
 */
export const formatNumber = (
  num: number | string,
  isArabic: boolean,
  options?: { minDigits?: number }
): string => {
  const numStr = String(num);
  const padded = options?.minDigits 
    ? numStr.padStart(options.minDigits, '0')
    : numStr;
  
  return toArabicNumerals(padded, isArabic);
};

