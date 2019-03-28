export {Bot, BotBuilder}

//************************************************************ */
// Enum
//************************************************************ */
export enum DialogActionType {
    ElicitIntent = "ElicitIntent",
    ElicitSlot = "ElicitSlot",
    ConfirmIntent = "ConfirmIntent",
    Close = "Close",
    Delegate = "Delegate"
}

export enum FulfillmentState {
    Fulfilled = "Fulfilled",
    Failed = "Failed"

}

export enum ConfirmationStatus {
    None = "None",
    Confirmed = "Confirmed",
    Denied = "Denied"
}

export enum InvocationSource {
    FulfillmentCodeHook = "FulfillmentCodeHook",
    DialogCodeHook = "DialogCodeHook"
}

export enum ContentType {
    PlainText = "PlainText",
}

//************************************************************ */
// Interface
//************************************************************ */
export interface SessionAttributes {
    [ket:string]: string
}

export interface Slots {
    [key:string]:string
}

export interface SlotDetails {
    [key:string]:{
        resolutions:{
            value:string
        }[]
        originalValue:string
    }
}

export interface ResponseCard {
    version: string,
    contentType: string,
    genericAttachments: [
        {
            title: string,
            subTitle: string,
            imageUrl: string,
            attachmentLinkUrl: string,
            buttons:[ 
                {
                    text: string,
                    value: string
                }
            ]
        } 
    ] 
}

export interface IntentRequest {
    messageVersion: string
    invocationSource:InvocationSource
    userId: string
    sessionAttributes: SessionAttributes
    requestAttributes: SessionAttributes|null
    bot: {
        name: string
        alias: string,
        version: string
    }
    outputDialogMode: string,
    currentIntent: {
        name: string
        slots: Slots
        slotDetails: SlotDetails
        confirmationStatus: ConfirmationStatus
    }
    inputTranscript: string
}

export interface Message {
    contentType: ContentType
    content: string
}

export interface HandlerInput {
    requestEnvelope: IntentRequest
    context: any
    responseBuilder: ResponseBuilder
    // Shortcut
    source: InvocationSource
    slots: Slots
    slotDetails: SlotDetails
    intentName: string
    attributes: SessionAttributes,
}

//************************************************************ */
// Response
//************************************************************ */

export interface ElicitIntentResponse {
    sessionAttributes: SessionAttributes,
    dialogAction: {
        type: DialogActionType.ElicitIntent,
        message?: Message
        responseCard?: ResponseCard
    },
}

export interface ElicitSlotResponse {
    sessionAttributes: SessionAttributes,
    dialogAction: {
        type: DialogActionType.ElicitSlot,
        intentName: string,
        slots: Slots,
        slotToElicit: string,
        message?: Message
        responseCard?: ResponseCard
    }
}

export interface CloseResponse {
    sessionAttributes: SessionAttributes,
    dialogAction: {
        type: DialogActionType,
        fulfillmentState: FulfillmentState,
        message?: Message
        responseCard?: ResponseCard
    }
}

export interface DelegateResponse {
    sessionAttributes: SessionAttributes,
    dialogAction: {
        type: DialogActionType,
        slots: Slots
    }
}

export type LexResponse = ElicitIntentResponse | ElicitSlotResponse | CloseResponse | DelegateResponse

//************************************************************ */
// Handler
//************************************************************ */
export interface RequestHandler {
    canHandle(input : HandlerInput) : Promise<boolean> | boolean;
    handle(input : HandlerInput) : Promise<LexResponse> | LexResponse;
}

export interface ErrorHandler {
    canHandle(handlerInput : HandlerInput, error : Error) : Promise<boolean> | boolean;
    handle(handlerInput : HandlerInput, error : Error) : Promise<LexResponse> | LexResponse;
}

//************************************************************ */
// class ResponseBuilder
//************************************************************ */
export class ResponseBuilder {

    getElicitIntentResponse(sessionAttributes: SessionAttributes, message?: Message, responseCard?: ResponseCard): ElicitIntentResponse {
        return {
            sessionAttributes: sessionAttributes, 
            dialogAction: {
                type: DialogActionType.ElicitIntent,
                message: message,
                responseCard: responseCard
            },
        };
    }

    getElicitSlotResponse(sessionAttributes: SessionAttributes, intentName:string, slots:Slots, slotToElicit:string, message?:Message, responseCard?: ResponseCard): ElicitSlotResponse {
        return {
            sessionAttributes: sessionAttributes,
            dialogAction: {
                type: DialogActionType.ElicitSlot,
                intentName: intentName,
                slots: slots,
                slotToElicit: slotToElicit,
                message: message,
                responseCard: responseCard
            }
        };
    }

    getCloseResponse(sessionAttributes: SessionAttributes, fulfillmentState: FulfillmentState, message: Message): CloseResponse {
        return {
            sessionAttributes: sessionAttributes,
            dialogAction: {
                type: DialogActionType.Close,
                fulfillmentState: fulfillmentState,
                message: message
            }
        };
    }

    getDelegateResponse(sessionAttributes: SessionAttributes, slots: Slots): DelegateResponse {
        return {
            sessionAttributes: sessionAttributes,
            dialogAction: {
                type: DialogActionType.Delegate,
                slots: slots
            }
        };
    }
}
//************************************************************ */
// class Bot
//************************************************************ */

class Bot {

    chains: RequestHandler[] = [];
    errorHandler: ErrorHandler;
    
    constructor() {

    }

    addRequestHandler(requestHandler: RequestHandler) {
        this.chains.push(requestHandler);
        return this;
    }
    
    addRequestHandlers(...requestHandlers : RequestHandler[]) {
        requestHandlers.forEach( requestHandler => {
            this.chains.push(requestHandler);
        })
        return this;
    } 

    addErrorHandler(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
        return this;
    }

    create() {
        return this;
    }

    invoke(requestEnvelope: IntentRequest, context:any) {
        if(!requestEnvelope.currentIntent){
            throw Error('ERROR: requestEnvelope.currentIntent undefined');
        }
        const input:HandlerInput = {
            requestEnvelope,
            context,
            responseBuilder: new ResponseBuilder(),
            source: requestEnvelope.invocationSource,
            slots: requestEnvelope.currentIntent.slots,
            slotDetails: requestEnvelope.currentIntent.slotDetails,
            intentName: requestEnvelope.currentIntent.name,
            attributes: requestEnvelope.sessionAttributes,
        };

        const targets = this.chains.filter( (handler:RequestHandler) => {
            return handler.canHandle(input);
        });
        try {
            if((<RequestHandler[]>targets).length > 0){
                return targets[0].handle(input);
            }
        } catch (error) {
            if(this.errorHandler.canHandle(input,error)){
                return this.errorHandler.handle(input, error);
            }
        } 
        throw Error('ERROR:No matching handler')  
    }
}

function BotBuilder() {
    return new Bot();
}
