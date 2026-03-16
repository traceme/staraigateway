/**
 * Calculate the budget reset date for a given reset day.
 * If current day is before resetDay, reset date is in the previous month.
 */
export function getBudgetResetDate(resetDay: number): Date {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();
	if (now.getDate() < resetDay) {
		return new Date(year, month - 1, resetDay);
	}
	return new Date(year, month, resetDay);
}
