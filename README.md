# LEX SDK
*[English](https://github.com/furuya02/lex-sdk/README.md) | [日本語](https://github.com/furuya02/lex-sdk/README.ja.md)*

## Overview

With LEX SDK for Node.js (TypeScript), you can create **Amazon Lex** code in the same way as [Alexa SDK V2](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs).

## Version

0.0.4

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

Error handler is a good place to inject your error handling logic such as unhandled request, api service time out, etc. The following sample adds a catch all error handler to your skill to ensure skill returns a meaningful message in case of all errors.

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

The Lambda handler is the entry point for your AWS Lambda function. 

The following code example creates a Lambda handler function to route all inbound request to your skill. The Lambda handler function creates an SDK Skill instance configured with the request handlers that you just created.


**JavaScript**
```js
let bot;
exports.handler = async function (event, context) {
    if (!bot) {
        bot = Lex.BotBuilder()
            .addRequestHandler(
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
            .addRequestHandler(
                OrderIntentHandler)
            .addErrorHandler(ErrorHandler)
            .create();
    }
    return bot.invoke(event, context);
}
```
