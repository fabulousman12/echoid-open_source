# ionic-thumbnail

To generate vieo thumnail

## Install

```bash
npm install ionic-thumbnail
npx cap sync
```

## API

<docgen-index>

* [`echo(...)`](#echo)
* [`generateThumbnail(...)`](#generatethumbnail)
* [`getFileInfo(...)`](#getfileinfo)
* [`initStartio(...)`](#initstartio)
* [`showStartioInterstitial()`](#showstartiointerstitial)
* [`showStartioRewarded()`](#showstartiorewarded)
* [Interfaces](#interfaces)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### echo(...)

```typescript
echo(options: { value: string; }) => Promise<{ value: string; }>
```

| Param         | Type                            |
| ------------- | ------------------------------- |
| **`options`** | <code>{ value: string; }</code> |

**Returns:** <code>Promise&lt;{ value: string; }&gt;</code>

--------------------


### generateThumbnail(...)

```typescript
generateThumbnail(options: GenerateThumbnailOptions) => Promise<GenerateThumbnailResult>
```

| Param         | Type                                                                          |
| ------------- | ----------------------------------------------------------------------------- |
| **`options`** | <code><a href="#generatethumbnailoptions">GenerateThumbnailOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#generatethumbnailresult">GenerateThumbnailResult</a>&gt;</code>

--------------------


### getFileInfo(...)

```typescript
getFileInfo(options: GetFileInfoOptions) => Promise<GetFileInfoResult>
```

| Param         | Type                                                              |
| ------------- | ----------------------------------------------------------------- |
| **`options`** | <code><a href="#getfileinfooptions">GetFileInfoOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#getfileinforesult">GetFileInfoResult</a>&gt;</code>

--------------------


### initStartio(...)

```typescript
initStartio(options: { appId: string; }) => Promise<void>
```

| Param         | Type                            |
| ------------- | ------------------------------- |
| **`options`** | <code>{ appId: string; }</code> |

--------------------


### showStartioInterstitial()

```typescript
showStartioInterstitial() => Promise<void>
```

--------------------


### showStartioRewarded()

```typescript
showStartioRewarded() => Promise<{ rewarded: boolean; viewedTime: number; }>
```

**Returns:** <code>Promise&lt;{ rewarded: boolean; viewedTime: number; }&gt;</code>

--------------------


### Interfaces


#### GenerateThumbnailResult

| Prop       | Type                |
| ---------- | ------------------- |
| **`data`** | <code>string</code> |


#### GenerateThumbnailOptions

| Prop       | Type                |
| ---------- | ------------------- |
| **`path`** | <code>string</code> |


#### GetFileInfoResult

| Prop            | Type                        |
| --------------- | --------------------------- |
| **`name`**      | <code>string \| null</code> |
| **`size`**      | <code>number \| null</code> |
| **`uri`**       | <code>string</code>         |
| **`persisted`** | <code>boolean</code>        |
| **`localPath`** | <code>string</code>         |


#### GetFileInfoOptions

| Prop      | Type                |
| --------- | ------------------- |
| **`uri`** | <code>string</code> |

</docgen-api>
