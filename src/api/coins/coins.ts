import {newHandler} from '../common/handlers';
export const coins_purchase = newHandler({
  requireUser: true,
  takesJSON: true
}, async({user, json}) => {
  console.log("USER: ", user);
  console.log("JSON: ", json);

  return {
    status: 200,
    body: {
      redirect: "url"
    }
  }
})