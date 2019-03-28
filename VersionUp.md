## メンテンナンス手順

### (1) develop/でlex-sdkを編集して動作確認

```
$ cd develop
$ vi index.ts
$ vi les-sdk.ts

```

### (2)　libへのコピー

```
cd ..
$ cp develop/lex-sdk.ts lib/lex-sdk.ts
$ vi lib/index.ts <= 公開するオブジェクトが変化した場合
$ tsc  <= dist/を更新
```

### (3) deplay

```
$ package.js <= バージョン番号更新
$ npm publish --access=public
```

### (4) GitHub

ドキュメント更新
```
$ vi README.ja.md
$ vi README.md
$ vi history.md
```
```
$ git add .
$ git commit -am "XX"
$ git push
```


