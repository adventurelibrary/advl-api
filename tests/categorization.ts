import fetch from "node-fetch";
import { testURL } from "./constants";

categorization();

export async function categorization(){
  //RUN add Tags/Categories before GET to make sure the new stuff shows up in the get
  
  await addTags();
  await addCategories();


  await getTags();
  await getCategories();
}

async function getTags(){
  try{
    let response = (await (await fetch(testURL+'assets/tags', {
      method: "get",
    })).json())
    console.debug("Tags: ", response);
    console.log("\x1b[32m%s\x1b[0m", "RAN: Get Tags")
  } catch (e) {
    console.error(e);    
  }
}

async function getCategories(){
  try{
    let response = (await (await fetch(testURL+'assets/categories', {
      method: "get",
    })).json())
    console.debug("Categories: ", response);
    console.log("\x1b[32m%s\x1b[0m", "RAN: Get Categories")
  } catch (e) {
    console.error(e);    
  }
}

async function addTags(){
  try{
    (await (await fetch(testURL+'assets/tags', {
      method: "post",
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        'tags': ['test_tag1', 'test_tag2', 'test_tag3']
      })
    })).json())
    console.log("\x1b[32m%s\x1b[0m", "RAN: Add Tags")
  } catch (e) {
    console.error(e);    
  }
}

async function addCategories(){
  try{
    (await (await fetch(testURL+'assets/categories', {
      method: "post",
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        'tags': ['test_category1', 'test_category2', 'test_category3']
      })
    })).json())
    console.log("\x1b[32m%s\x1b[0m", "RAN: Add Categories")
  } catch (e) {
    console.error(e);    
  }
}