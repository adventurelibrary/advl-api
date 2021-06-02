import {newHandler} from '../common/handlers';

export const bundle_create = newHandler({
  includeUser: true
}, async ({user, event}) => {
  console.log(user);
  console.log(event);
  

  try{
     return {
       status: 200,
       body: JSON.stringify({success:true})
     }
  } catch (e) {
    throw e;
  }
})