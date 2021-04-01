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

export type category = "map" | "token" | "character_art"

export type tags = "science_fiction" |
                   "fantasy" |
                   "horror" |
                   "cyberpunk" |
                   "modern" | 
                   "ww2"