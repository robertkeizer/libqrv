## libqrv

`libqrv` is a node module that is used to encode data into video streams. Specifically it does this by transforming data into QR codes, and stitching the multiple frames together into a single video file.

## Usage

### Basic

**convertFile** - `convertFile( existingFile, [newFilePath, ] cb )`

```js
const { convertFile } = require( "libqrv" );

convertFile( "./some/file.txt", "./another/location/output.mp4", ( err ) => {

	// err is null unless there is an error
	if( err ){
		return console.log( "Couldn't convert the file.. " + err );
	}

	// "./another/location/output.mp4" exists
} );
```

```js
const { convertFile } = require( "libqrv" );

convertFile( "./some/file.txt", ( err ) => {

	if( err ){
		return console.log( "Couldn't convert the file.. " + err );
	}

	// if err is not null, and no newFIlePath has been specified
	// existingFile + ".mp4" is assumed.

	// "./some/file.txt.mp4" exists
	
} );
```


### Customized

The LibQRV library itself provides some customization. There are a lot of opportunities that exist to expose more configuration, and functionality.

**Default Options**
```
{
  "debug": false,
  "outputDirectory": "/tmp/tmp-34.........", // geneated by tmp
  "qr": {
    "width": 240,
    "scale": 1,
    "margin": 0,
    "errorCorrectionLevel": "low"
  },
  "video": {
    "output": {
      "framerate": 25
    },
    "input": {
      "framerate": 1
    }
  }
}
```

**Options to constructor**

| Option Name | Default Value | Description |
| ------------------ | ------------- | ----------- |
| `outputDirectory` | Dynamically Generated ( uses `tmp` ) | The directory where the output `.mp4` will be placed. |
| `debug` | `false` | Whether or not to emit `debug` events |
| `qr` | See QR Options | Configuration that relates to QR Code generation |
| `video` | See Video Options | Configuration that relates to the video generation |

**QR Options**

| Option Name | Default Value | Description |
| ------------------ | ------------- | ----------- |
| `width` | `240` | The width of the QR code frame that is generated |
| `scale` | `1` | The number of pixels that are used per "block" to make up the QR code |
| `margin` | `0` | The amount of blank space that is kept around the QR code. Synonymous with HTML `padding` |
| `errorCorrectionLevel` | `"low"` | How much error correction is used in the QR code. |

**Video Options**

| Option Name | Default Value | Description |
| ------------------ | ------------- | ----------- |
| `input.framerate` | `1` | The framerate relating to the QR code images. Per second |
| `output.framerate` | `25` | The output `.mp4` video framerate. Per second |


**Constructor**
LibQRV uses a configuration object that is passed into the constructor. Additionally, the constructor takes a callback that is called with `cb( err, instance )` where `err` should be `null`, and `instance` is the newly created instance of `LibQRV`. 

```js
const { LibQRV } = require( "libqrv" );

const configToUse = {
	debug: true
};

new LibQRV( configToUse, ( err, libqrv ) => {

	// libqrv can be used here
} );
```

## Help Wanted
If you find this module or repository useful, please consider making a pull request to it.

As people start to utilize the module, more improvements will be made.
