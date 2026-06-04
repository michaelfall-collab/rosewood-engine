export const formatKey = (key: string) => {
  if (!key) return '';
  return key
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
