export interface CandidateCategoryOption {
  id: string;
  name: string;
  slug: string;
  status: string;
  hasRunways: boolean;
  occupiedFraternityIds: string[];
}

export interface RegisteredCandidate {
  id: string;
  fullName: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  fraternityId: string;
  fraternityName: string;
  university: string;
  photoUrl: string | null;
  career: string | null;
}
