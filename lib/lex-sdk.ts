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

export enum CardContentType {
    Generic = "application/vnd.amazonaws.card.generic",
}

//************************************************************ */
// PersistenceAdapter
//************************************************************ */
export interface PersistenceAdapter {
    getAttributes(userId : string) : Promise<{[key : string] : any}>;
    saveAttributes(userId : string, attributes : {[key : string] : any}) : Promise<void>;
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
    contentType: CardContentType,
    genericAttachments: [
        {
            title: string,
            subTitle: string,
            imageUrl: string,
            attachmentLinkUrl: string,
            buttons: {text: string, value: string}[] 
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
    //attributes: SessionAttributes,
    attributesManager: AttributesManager
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

export interface RequestInterceptor {
    process(handlerInput: HandlerInput): Promise<void> | void;
}

export interface ResponseInterceptor {
    process(handlerInput: HandlerInput, response?: Promise<LexResponse> | LexResponse): Promise<void> | void;
}

//************************************************************ */
// class ResponseBuilder
//************************************************************ */
export class ResponseBuilder {

    getElicitIntentResponse(message?: Message, responseCard?: ResponseCard): ElicitIntentResponse {
        return {
            sessionAttributes: {}, 
            dialogAction: {
                type: DialogActionType.ElicitIntent,
                message: message,
                responseCard: responseCard
            },
        };
    }

    getElicitSlotResponse(intentName:string, slots:Slots, slotToElicit:string, message?:Message, responseCard?: ResponseCard): ElicitSlotResponse {
        return {
            sessionAttributes: {},
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

    getCloseResponse(fulfillmentState: FulfillmentState, message: Message): CloseResponse {
        return {
            sessionAttributes: {},
            dialogAction: {
                type: DialogActionType.Close,
                fulfillmentState: fulfillmentState,
                message: message
            }
        };
    }

    getDelegateResponse(slots: Slots): DelegateResponse {
        return {
            sessionAttributes: {},
            dialogAction: {
                type: DialogActionType.Delegate,
                slots: slots
            }
        };
    }
}

//************************************************************ */
// class DynamoDbPersistenceAdapter
//************************************************************ */
import * as AWS from 'aws-sdk'

class DynamoDbPersistenceAdapter implements PersistenceAdapter {

    private tableName: string;
    private attributesId: string;
    private createTable: boolean;
    private attributesName: string = 'attributes';
    protected docClient : AWS.DynamoDB.DocumentClient;
    private partitionKeyName = 'id';
    private dynamoDb: AWS.DynamoDB| undefined = undefined;

    constructor(tableName: string,
                attributesId: string,
                createTable? : boolean,
                dynamoDB?: AWS.DynamoDB) {
        this.tableName = tableName;
        this.attributesId = attributesId;
        this.createTable = (createTable) ? createTable : true;
        
        if(dynamoDB){
            this.dynamoDb = dynamoDB;
        } else {
            this.dynamoDb = new AWS.DynamoDB();
        }
        this.docClient = new AWS.DynamoDB.DocumentClient({
            convertEmptyValues : true,
            service : this.dynamoDb,
        });

        if (this.createTable) {
            const createTableParams : AWS.DynamoDB.CreateTableInput = {
                AttributeDefinitions: [{
                    AttributeName: this.partitionKeyName,
                    AttributeType: 'S',
                }],
                KeySchema: [{
                    AttributeName: this.partitionKeyName,
                    KeyType: 'HASH',
                }],
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5,
                },
                TableName : this.tableName,
            };

            this.dynamoDb.createTable(createTableParams, (err) => {
                if (err && err.code !== 'ResourceInUseException') {
                    throw Error('Could not create table (' + this.tableName + '): ' + err.message)
                }
            });
        }

    }
    
    async getAttributes(_userId : string) : Promise<{[key : string] : any}> {

        const getParams : AWS.DynamoDB.DocumentClient.GetItemInput = {
            Key : {
                [this.partitionKeyName] : this.attributesId,
            },
            TableName : this.tableName,
            ConsistentRead : true,
        };

        let data : AWS.DynamoDB.DocumentClient.GetItemOutput;
        try {
            data = await this.docClient.get(getParams).promise();
        } catch (err) {
            throw Error('Could not read item (' + this.attributesId + ' from table (' + getParams.TableName + ' ' +err.message);
        }

        if (!Object.keys(data).length || data.Item === undefined) {
            return {};
        } else {
            return data.Item[this.attributesName];
        }
    };

    async saveAttributes(_userId : string, attributes : {[key : string] : any}) : Promise<void> {
        const putParams : AWS.DynamoDB.DocumentClient.PutItemInput = {
            Item: {
                [this.partitionKeyName] : this.attributesId,
                [this.attributesName] : attributes,
            },
            TableName : this.tableName,
        };

        try {
            await this.docClient.put(putParams).promise();
        } catch (err) {
            throw Error(
                'Could not save item (' + this.attributesId + ') to table (' + putParams.TableName + '): '+ err.message,
            );
        }
    };

    // public async deleteAttributes(_requestEnvelope : RequestEnvelope) : Promise<void> {

    //     const deleteParams : DynamoDB.DocumentClient.DeleteItemInput = {
    //         Key : {
    //             [this.partitionKeyName] : this.attributesId,
    //         },
    //         TableName : this.tableName,
    //     };

    //     try {
    //         await this.docClient.delete(deleteParams).promise();
    //     } catch (err) {
    //         throw Error(
    //             `Could not delete item (${this.attributesId}) from table (${deleteParams.TableName}): ${err.message}`,
    //         );
    //     }
    // }

    setDocClient(docClient: AWS.DynamoDB.DocumentClient){
        this.docClient = docClient;

    }
}

//************************************************************ */
// class AttributesManager
//************************************************************ */
class AttributesManager {

    private persistenceAdapter: PersistenceAdapter|undefined;
    private requestAttributes : {[key : string] : string}
    sessionAttributes : {[key : string] : string}
    persistentAttributes : {[key : string] : string} | undefined;
    persistentAttributesId :string |undefined;

    constructor(requestEnvelope: IntentRequest, persistentAttributesId: string|undefined, persistenceAdapter: PersistenceAdapter|undefined) {
        this.persistenceAdapter = persistenceAdapter;
        this.sessionAttributes = requestEnvelope.sessionAttributes;
        this.requestAttributes = {};
        this.persistentAttributes = undefined;
        this.persistentAttributesId = persistentAttributesId;
    }
    
    getSessionAttributes() : {[key : string] : any} {
        let tmpSessionAttributes = this.sessionAttributes
        return tmpSessionAttributes;//this.sessionAttributes;
    };
    
    setSessionAttributes(sessionAttributes : {[key : string] : any}) : void {
        this.sessionAttributes = sessionAttributes;
    };
    
    getRequestAttributes() : {[key : string] : any} {
        return this.requestAttributes;
    };

    setRequestAttributes(requestAttributes : {[key : string] : any}) : void {
        this.requestAttributes = requestAttributes;
    };
    
    async getPersistentAttributes() : Promise<{[key : string] : any}> {
        if(this.persistenceAdapter != undefined && this.persistentAttributesId != undefined) {
            if(this.persistentAttributes == undefined) {
                this.persistentAttributes = await this.persistenceAdapter.getAttributes(this.persistentAttributesId);
            }
            return this.persistentAttributes; 
        } else{
            throw Error('PersistentAttributes not initialized.')
        }
    };

    setPersistentAttributes(persistentAttributes : {[key : string] : any}) : void {
        if(this.persistenceAdapter  && this.persistentAttributesId) {
            this.persistentAttributes = persistentAttributes;
        } else {
            throw Error('PersistentAttributes not initialized.')
        }
    };

    async savePersistentAttributes() : Promise<void> {
        if(this.persistenceAdapter  && this.persistentAttributesId) {
            if(this.persistentAttributes!=undefined){
                await this.persistenceAdapter.saveAttributes(this.persistentAttributesId, this.persistentAttributes);
            }
        } else {
            throw Error('PersistentAttributes not initialized.')
        }
    };
}


//************************************************************ */
// class Bot
//************************************************************ */

class Bot {

    requestChains: RequestHandler[] = [];
    errorChains: ErrorHandler[] = [];
    requestInterceptorChains: RequestInterceptor[] = [];
    responseInterceptorChains: ResponseInterceptor[] = [];
    persistenceAdapter: PersistenceAdapter|undefined = undefined;
    tableName: string|undefined = undefined;
    attributesId: string|undefined = undefined;
    autoCreateTable: boolean = false;
    attributesManager:AttributesManager;
    dynamoDb : AWS.DynamoDB|undefined = undefined;
     
    constructor() {

    }

    addRequestInterceptors(...requestInterceptors : RequestInterceptor[]): Bot {
        requestInterceptors.forEach( requestInterceptor => {
            this.requestInterceptorChains.push(requestInterceptor);
        })
        return this;
    } 

    addResponseInterceptors(...responseInterceptors : ResponseInterceptor[]): Bot {
        responseInterceptors.forEach( responseInterceptor => {
            this.responseInterceptorChains.push(responseInterceptor);
        })
        return this;
    } 

    addRequestHandler(requestHandler: RequestHandler): Bot {
        this.requestChains.push(requestHandler);
        return this;
    }
    
    addRequestHandlers(...requestHandlers : RequestHandler[]): Bot {
        requestHandlers.forEach( requestHandler => {
            this.requestChains.push(requestHandler);
        })
        return this;
    } 

    addErrorHandler(errorHandler: ErrorHandler): Bot {
        this.errorChains.push(errorHandler);
        return this;
    }

    addErrorHandlers(...errorHandlers : ErrorHandler[]): Bot {
        errorHandlers.forEach( errorHandler => {
            this.errorChains.push(errorHandler);
        })
        return this;
    } 
    
    withPersistenceAdapter(persistenceAdapter : PersistenceAdapter): Bot {
        this.persistenceAdapter = persistenceAdapter;
        return this;
    }

    // Lexの場合は、UserIdを主キーにできないので、明示的に指定する必要があります。
    withTableName(tableName : string, attributesId: string): Bot {
        this.tableName = tableName;
        this.attributesId = attributesId;
        return this;
    }

    withAutoCreateTable(autoCreateTable : boolean): Bot{
        this.autoCreateTable = autoCreateTable;
        return this;
    }

    withDynamoDbClient(dynamoDb: AWS.DynamoDB): Bot {
        this.dynamoDb =  dynamoDb;
        return this;
    }


    create(): Bot {
        if(this.tableName !=  undefined && this.attributesId != undefined) {
            this.persistenceAdapter = new DynamoDbPersistenceAdapter(this.tableName, this.attributesId, this.autoCreateTable, this.dynamoDb);
        }

        return this;
    }

    async invoke(requestEnvelope: IntentRequest, context:any) {
        if(!requestEnvelope.currentIntent){
            throw Error('ERROR: requestEnvelope.currentIntent undefined');
        }

        this.persistenceAdapter;
        this.attributesManager = new AttributesManager(requestEnvelope, this.attributesId, this.persistenceAdapter);

        const input:HandlerInput = {
            requestEnvelope,
            context,
            responseBuilder: new ResponseBuilder(),
            source: requestEnvelope.invocationSource,
            slots: requestEnvelope.currentIntent.slots,
            slotDetails: requestEnvelope.currentIntent.slotDetails,
            intentName: requestEnvelope.currentIntent.name,
            attributesManager: this.attributesManager,
        };

        this.requestInterceptorChains.forEach(requestInterceptor=>{
            requestInterceptor.process(input);
        })

        const requestTargets = this.requestChains.filter( (handler:RequestHandler) => {
            return handler.canHandle(input);
        });
        try {
            if((<RequestHandler[]>requestTargets).length > 0){
                let response = await requestTargets[0].handle(input);

                this.responseInterceptorChains.forEach(responseInterceptor => {
                    responseInterceptor.process(input, response);
                })
                
                response.sessionAttributes = this.attributesManager.sessionAttributes;
                
                return response;
            }
        } catch (error) {

            const errorTargets = this.errorChains.filter( (handler:ErrorHandler) => {
                return handler.canHandle(input, error);
            });
            if((<ErrorHandler[]>errorTargets).length > 0){
                return errorTargets[0].handle(input, error);
            }
        } 
        throw Error('ERROR:No matching handler')  
    }
}

function BotBuilder() {
    return new Bot();
}
