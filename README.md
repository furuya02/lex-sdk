# LEX SDK

## Overview

With LEX SDK for Node.js (TypeScript), you can create **Amazon Lex** code in the same way as [Alexa SDK V2](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs).

## Version

0.1.2

## Install

```
npm install --save lex-sdk
```

## Importing Dependencies

**JavaScript**
```
const Lex = require('lex-sdk');
```
**TypeScript**
```
import * as Lex from 'lex-sdk';
```

## Adding Request Handlers

The following code example shows how to configure a handler to be invoked when the skill receives the OrderFlowers(Intent).

**JavaScript**
```js
const OrderIntentHandler = {
    canHandle(h) {
        return (h.intentName == 'OrderFlowers')
    },
    handle(h) {
        
        if (h.source === Lex.InvocationSource.DialogCodeHook) {
            
            return h.responseBuilder
                .getDelegateResponse(h.attributes, h.slots)

        } else {  // FulfillmentCodeHook

            const message =  {
                 contentType: Lex.ContentType.PlainText,
                 content: `Thank you for your order.` };

            return h.responseBuilder
            .getCloseResponse(
                h.attributes,
                Lex.FulfillmentState.Fulfilled,
                message)
        }
    }
}

```

**TypeScript**
```ts
const OrderIntentHandler: Lex.RequestHandler = {
    canHandle(h: Lex.HandlerInput) {
        return (h.intentName == 'OrderFlowers')
    },
    handle(h: Lex.HandlerInput) {
        
        if (h.source === Lex.InvocationSource.DialogCodeHook) {
            
            return h.responseBuilder
                .getDelegateResponse(h.attributes, h.slots)

        } else {  // FulfillmentCodeHook

            const message =  { 
                contentType: Lex.ContentType.PlainText,
                content: `Thank you for your order.` };

            return h.responseBuilder
            .getCloseResponse(
                h.attributes,
                Lex.FulfillmentState.Fulfilled,
                message)
        }
    }
}
```

## Adding Error Handler

The error handler is suitable for injecting unprocessed requests, error handling logic. In the next sample, the bot will return an error message if all errors occur.

**JavaScript**
```js
const ErrorHandler = {
    canHandle(h, error) {
        return true;
    },
    handle(h, error) {
        const message =  {
            contentType: Lex.ContentType.PlainText,
            content: "ERROR " + error.message };
        return h.responseBuilder
        .getCloseResponse(
            h.attributes,
            Lex.FulfillmentState.Fulfilled,
            message)
    }
}
```
**TypeScript**
```ts
const ErrorHandler = {
    canHandle(_h: Lex.HandlerInput, _error: Error) {
        return true;
    },
    handle(h: Lex.HandlerInput, error: Error) {
        const message =  {
            contentType: Lex.ContentType.PlainText, 
            content: "ERROR " + error.message };
        return h.responseBuilder
        .getCloseResponse(
            h.attributes,
            Lex.FulfillmentState.Fulfilled,
            message)
    }
}
```

## Creating the Lambda Handler

The entry point of the Lambda function.

The following code example is an example of processing requests to all Lambda with SDK.

**JavaScript**
```js
let bot;
exports.handler = async function (event, context) {
    if (!bot) {
        bot = Lex.BotBuilder()
            .addRequestHandlers(
                OrderIntentHandler)
            .addErrorHandler(ErrorHandler)
            .create();
    }
    return bot.invoke(event, context);
}
```
**TypeScript**
```ts
let bot: Lex.Bot;
exports.handler = async function (event: Lex.IntentRequest, context: any) {
    if (!bot) {
        bot = Lex.BotBuilder()
            .addRequestHandlers(
                OrderIntentHandler)
            .addErrorHandler(ErrorHandler)
            .create();
    }
    return bot.invoke(event, context);
}
```
