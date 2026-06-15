export const MASJID_UNKNOWN = 'মসজিদ জানা নেই';

export const MASJID_UNKNOWN_COLOR = '#B91C1C';

export type MasjidSelectOption = {
  label: string;
  value: string;
  textColor?: string;
};

export function buildMasjidSelectOptions(masjids: string[]): MasjidSelectOption[] {
  const knownMasjids = masjids.filter((name) => name !== MASJID_UNKNOWN);
  return [
    { label: MASJID_UNKNOWN, value: MASJID_UNKNOWN, textColor: MASJID_UNKNOWN_COLOR },
    ...knownMasjids.map((name) => ({ label: name, value: name })),
  ];
}
