export interface Categorization{
  name: string
  type: "tag" | "category"
}

export interface REQ_Add_Tags {
  tags: string[]
}

export interface REQ_Add_Categories {
  categories: string[]
}