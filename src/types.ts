export interface KiotVietProduct {
  id: number;
  code: string;
  name: string;
  fullName: string;
  categoryId: number;
  categoryName: string;
  basePrice: number;
  images?: string[];
  inventories?: {
    branchId: number;
    branchName: string;
    onHand: number;
  }[];
}
