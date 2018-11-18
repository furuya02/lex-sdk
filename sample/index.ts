
// Order Flower Sample

import * as Lex from 'lex-sdk';

let bot: Lex.Bot;
exports.handler = async function (event: Lex.IntentRequest, context: any) {
    console.log(JSON.stringify(event));
    if (!bot) {
        bot = Lex.BotBuilder()
            .addRequestHandler(
                OrderIntentHandler)
            .addErrorHandler(ErrorHandler)
            .create();
    }
    return bot.invoke(event, context);
}

const ErrorHandler = {
    canHandle(_h: Lex.HandlerInput, _error: Error) {
        return true;
    },
    handle(h: Lex.HandlerInput, error: Error) {
        const message =  { contentType: Lex.ContentType.PlainText, content: "ERROR " + error.message };
        return h.responseBuilder
        .getCloseResponse(
            h.attributes,
            Lex.FulfillmentState.Fulfilled,
            message)
    }
}

const OrderIntentHandler: Lex.RequestHandler = {
    canHandle(h: Lex.HandlerInput) {
        return (h.intentName == 'OrderFlowers')
    },
    handle(h: Lex.HandlerInput) {

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
                    h.attributes,
                    h.intentName,
                    h.slots,
                    validationResult.violatedSlot,
                    message);
            }
            if (flowerType) {
                h.attributes.Price = String(flowerType.length * 5); // Elegant pricing model
            }
            return h.responseBuilder
                .getDelegateResponse(h.attributes, h.slots)

        } else {  // FulfillmentCodeHook

            const message =  { contentType: Lex.ContentType.PlainText, content: `Thanks, your order for ${flowerType} has been placed and will be ready for pickup by ${time} on ${date}` };

            return h.responseBuilder
            .getCloseResponse(
                h.attributes,
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


