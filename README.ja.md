# LEX SDK

##  概要

Node.js (TypeScript) 用のLEX SDKでは、[Alexa SDK V2](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs)と同じ感じで**Amazon Lex**のコード作成できます。

## バージョン

0.2.0

## インストール

```
npm install --save lex-sdk
```


## 依存関係のインポート
**JavaScript**
```
const Lex = require('lex-sdk');
```
**TypeScript**
```
import * as Lex from 'lex-sdk';
```

## ハンドラーの追加

次のコード例は、スキルがOrderFlowers(インテント)を受け取ったときに呼び出されるようにハンドラを設定する例です。


**JavaScript**
```js
const OrderIntentHandler = {
    canHandle(h) {
        return (h.intentName == 'OrderFlowers')
    },
    handle(h) {
        
        if (h.source === Lex.InvocationSource.DialogCodeHook) {
            
            return h.responseBuilder
                .getDelegateResponse(h.slots)

        } else {  // FulfillmentCodeHook

            const message =  {
                 contentType: Lex.ContentType.PlainText,
                 content: `Thank you for your order.` };

            return h.responseBuilder
            .getCloseResponse(
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
                .getDelegateResponse(h.slots)

        } else {  // FulfillmentCodeHook

            const message =  { 
                contentType: Lex.ContentType.PlainText,
                content: `Thank you for your order.` };

            return h.responseBuilder
            .getCloseResponse(
                Lex.FulfillmentState.Fulfilled,
                message)
        }
    }
}
```

## エラーハンドラーの追加

エラーハンドラは、処理されていないリクエスト、APIサービスのタイムアウトなどのエラー処理ロジックを注入するのに適しています。次のサンプルでは、すべてのエラーが発生した場合にスキルが意味のあるメッセージを返すように、

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
            Lex.FulfillmentState.Fulfilled,
            message)
    }
}
```

## Lambdaハンドラの作成

Lambdaハンドラは、AWS Lambda関数のエントリポイントです。 

次のコード例は、すべての着信要求を自分のスキルにルーティングするためのLambdaハンドラ関数を作成します。 Lambdaハンドラ関数は、作成したリクエストハンドラで構成されたSDKスキルインスタンスを作成します。

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
