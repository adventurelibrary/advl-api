import { REQ_Purchase } from '../../interfaces/IPayment';
import {newHandler} from '../common/handlers';
import * as payment from '../common/payments';
import * as db from '../common/postgres';

export const coins_purchase = newHandler({
  requireUser: true,
  takesJSON: true
}, async({user, json}) => {
  console.log("USER: ", user);
  console.log("JSON: ", json);

  let paymentInfo:REQ_Purchase = json;
  // confirm product exists in the database and is ACTIVE
  // 

  return {
    status: 200,

  }
})
