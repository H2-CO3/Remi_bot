export function parsePrice(priceText) {
  if (!priceText) return null;
  
  const cleanText = priceText.replace(/\s+/g, ' ').trim();
  
  const priceMatch = cleanText.match(/(\d+(?:[,.]?\d+)?)\s*€?/);
  
  if (priceMatch) {
    const price = parseFloat(priceMatch[1].replace(',', '.'));
    return isNaN(price) ? null : price;
  }
  
  return null;
}

export function formatPrice(price) {
  if (price === null || price === undefined) return 'N/A';
  return `${price.toFixed(2)}€`;
}