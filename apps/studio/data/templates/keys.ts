export const templateKeys = {
  detail: (templateSlug: string | undefined) => ['templates', 'detail', templateSlug] as const,
  detailByUrl: (templateUrl: string | undefined) =>
    ['templates', 'detail-by-url', templateUrl] as const,
  componentSources: (templateUrl: string | undefined, paths: string[]) =>
    ['templates', 'component-sources', templateUrl, ...paths] as const,
}
