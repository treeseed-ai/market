export function sortFeaturedFirst<T extends { data: { featured?: boolean; title: string } }>(entries: T[]) {
	return [...entries].sort((left, right) => {
		const featuredDiff = Number(Boolean(right.data.featured)) - Number(Boolean(left.data.featured));
		if (featuredDiff !== 0) return featuredDiff;
		return left.data.title.localeCompare(right.data.title, undefined, { sensitivity: 'base' });
	});
}
