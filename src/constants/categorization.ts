import YAML from 'yamljs';

export interface Tag{
  name: string,
  aliases: string[]
}

export interface Category {
  name: string,
  description: string
}

export const Tags:Tag[] = YAML.load('src/constants/tags.yml');
export const Categories:Category[] = YAML.load('src/constants/tags.yml');

/**
 * 
 * @param potentialTag This is the tag name or alias that you're looking for. 
 * The function will return the relevant Tag entry that includes this.
 * Returns undefined if no matching tag is found
 */
export function GetTag(potentialTag:string):Tag{
  return Tags.find(tag => (tag.name == potentialTag || tag.aliases.includes[potentialTag]))
}

/**
 * 
 * @param potentialCategory This is the name of the category that you're searching for.
 * The function will return the relevant category that matches your search, or undefined
 * if the category isn't defined.
 */
export function GetCategory(potentialCategory:string): Category{
  return Categories.find(cat => cat.name == potentialCategory);
}