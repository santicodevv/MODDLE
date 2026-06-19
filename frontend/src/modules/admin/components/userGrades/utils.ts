export const getGradeColor = (grade: number | null) => {
  if (grade === null) return 'text-gray-400';
  if (grade <= 5) return 'text-red-600 font-semibold';
  if (grade > 5 && grade < 7) return 'text-orange-500 font-semibold';
  if (grade >= 7 && grade < 9) return 'text-yellow-600 font-semibold';
  if (grade >= 9 && grade <= 10) return 'text-green-600 font-semibold';
  return 'text-gray-600 font-semibold';
};
