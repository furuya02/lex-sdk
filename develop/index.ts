
// Order Flower Sample
import * as Lex from './lex-sdk';
const AWS = require('aws-sdk');
AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: 'developer'});
const tableName = 'let-sdk-sample2';

let bot: Lex.Bot;
declare var exports: any; 
exports.handler = async function (event: Lex.IntentRequest, context: any) {
    console.log(JSON.stringify(event));
    if (!bot) {
        bot = Lex.BotBuilder()
            .addRequestHandlers(
                OrderIntentHandler)
            .addRequestInterceptors(requestInspectorHandler)
            .withTableName(tableName, "target") // テーブル名指定
            .withAutoCreateTable(true) //テーブル作成もスキルから行う
            .withDynamoDbClient(
                new AWS.DynamoDB({ apiVersion: "latest", region: "us-east-1" })
            )
            .addErrorHandlers(ErrorHandler)
            .create();
    }
    return bot.invoke(event, context);
}

  
// exports.handler = async function (event, context) {
//     if (!skill) {
//       skill = Alexa.SkillBuilders.standard() 
//         .addRequestHandlers(TestHandler)
//         .withTableName(tableName) // テーブル名指定
//         .withAutoCreateTable(true) //テーブル作成もスキルから行う
//         .withDynamoDbClient(
//           new AWS.DynamoDB({ apiVersion: "latest", region: "us-east-1" })
//         )
    


const requestInspectorHandler: Lex.RequestInterceptor = {
    process(_h: Lex.HandlerInput) {

    }
}

const ErrorHandler = {
    canHandle(_h: Lex.HandlerInput, _error: Error) {
        return true;
    },
    handle(h: Lex.HandlerInput, error: Error) {
        const message =  { contentType: Lex.ContentType.PlainText, content: "ERROR " + error.message };
        return h.responseBuilder
        .getCloseResponse(
            Lex.FulfillmentState.Fulfilled,
            message)
    }
}

const OrderIntentHandler: Lex.RequestHandler = {
    canHandle(h: Lex.HandlerInput) {
        return (h.intentName == 'OrderFlowers')
    },
    async handle(h: Lex.HandlerInput) {
        // セッション情報の取得
        let attributes = await h.attributesManager.getPersistentAttributes();
        if(attributes.count == undefined){
            attributes.count = 0;
        };
        console.log("😍" + attributes.count);
        attributes.count = Number(attributes.count) + 1;
        await h.attributesManager.setPersistentAttributes(attributes);
        await h.attributesManager.savePersistentAttributes();


        const flowerType = h.slots['FlowerType'];
        const date = h.slots['PickupDate'];
        const time = h.slots['PickupTime'];
        
        if (h.source === Lex.InvocationSource.DialogCodeHook) {
            const validationResult = validateOrderFlowers(flowerType, date, time);
            let message: Lex.Message|undefined;
            if (!validationResult.isValid) {
                if(validationResult.message){
                    message = {contentType:Lex.ContentType.PlainText, content: validationResult.message};
                }
                return h.responseBuilder.getElicitSlotResponse(
                    h.intentName,
                    h.slots,
                    validationResult.violatedSlot,
                    message);
            }
            if (flowerType) {
                // let attributes = h.attributesManager.getSessionAttributes();
                // attributes.Price = String(flowerType.length * 5); // Elegant pricing model
                // h.attributesManager.setSessionAttributes(attributes);

                // let attributes = await h.attributesManager.getPersistentAttributes();
                // console.log("attributes" + JSON.stringify(attributes));
                // attributes.Price = String(flowerType.length * 5); // Elegant pricing model
                // console.log("attributes" + JSON.stringify(attributes));
                // h.attributesManager.setPersistentAttributes(attributes);

            }
            return h.responseBuilder
                .getDelegateResponse(h.slots)
        } else {  // FulfillmentCodeHook

            const message =  { contentType: Lex.ContentType.PlainText, content: `Thanks, your order for ${flowerType} has been placed and will be ready for pickup by ${time} on ${date}` };

            return h.responseBuilder
            .getCloseResponse(
                Lex.FulfillmentState.Fulfilled,
                message)
        }
    }
}

//************************************************* */
// Varidation
//************************************************* */

 interface ValidationResult {
    isValid: boolean;
    violatedSlot: string;
    message?: string
}

function validateOrderFlowers(flowerType:string, date:string, time:string): ValidationResult {

    // ゆり、バラ、チューリップのみ受け付ける
    const flowerTypes = ['lilies', 'roses', 'tulips'];
    if (flowerType && flowerTypes.indexOf(flowerType.toLowerCase()) === -1) {
        return { isValid: false, violatedSlot: 'FlowerType', message: `We do not have ${flowerType}, would you like a different type of flower?  Our most popular flowers are roses`}
    }
    if (date) {
        // 日付が無効
        if (!isValidDate(date)) {
            return { isValid: false, violatedSlot:'PickupDate', message: 'I did not understand that, what date would you like to pick the flowers up?'}
        }
        // 過去の日付は受け付けない
        if (parseLocalDate(date) < new Date()) {
            return { isValid: false, violatedSlot:'PickupDate', message: 'You can pick up the flowers from tomorrow onwards.  What day would you like to pick them up?'}
        }
    }
    if (time) {
        // 時間指定が無効（モデルで定義されたプロンプトを使用）
        if (time.length !== 5) {
            return { isValid: false, violatedSlot: 'PickupTime'}
        }
        const hour = parseInt(time.substring(0, 2), 10);
        const minute = parseInt(time.substring(3), 10);
        if (isNaN(hour) || isNaN(minute)) {
            return { isValid: false, violatedSlot: 'PickupTime'}
        }
        // 営業時間は10時からPM5時
        if (hour < 10 || hour > 16) {
            return { isValid: false, violatedSlot: 'PickupTime', message: 'Our business hours are from ten a m. to five p m. Can you specify a time during this range?'}
        }
    }
    return { isValid:true, violatedSlot:''}
}

function parseLocalDate(date: string) {
    const dateComponents = date.split(/\-/);
    return new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2]));
}

function isValidDate(date: string): boolean {
    try {
        return !(isNaN(parseLocalDate(date).getTime()));
    } catch (err) {
        return false;
    }
}


