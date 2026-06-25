import type { SharedProductSummary } from "@music-store/shared-types";

export interface ProductRecord extends SharedProductSummary {
  pk: string;
  sk: string;
  createdAt: string;
  updatedAt: string;
}
