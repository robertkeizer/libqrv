const util	= require( "util" );
const events	= require( "events" );
const path	= require( "path" );
const fs	= require( "fs" );

const async	= require( "async" );
const Joi	= require( "joi" );
const tmp	= require( "tmp" );
const uuidv4	= require( "uuid/v4" );
const rimraf	= require( "rimraf" );

const QRCode		= require( "qrcode" );
const FfmpegCommand	= require('fluent-ffmpeg');


const LibQRV = function( _config, cb ){

	events.EventEmitter.call( this );

	// Used to hold readable streams
	// that this instance consumes
	this._queue = [ ];

	this._stopping = false;
	this._stopped = false;

	async.waterfall( [ ( cb ) => {

		Joi.validate( _config, Joi.object( ).keys( {
			tmpDirectory: Joi.string( ).default( ( ) => {
				return tmp.dirSync( ).name;
			}, "Uses tmp.dirSync node module." ),
			debug: Joi.boolean( ).default( false )
		} ), cb );

	}, ( validConfig, cb ) => {

		this.config = validConfig;

		this._initQueuePoll( );

		return cb( null, this );

	} ], cb );
};

util.inherits( LibQRV, events.EventEmitter );

LibQRV.prototype._encode = function( data, opts, cb ){
	// This exists as an abstraction method
	// for later use. Specifically different 
	// kinds of encoding/decoding can be used
	// later, based on config.

	/*
	opts = {
		frameCount: $(int),
		tmpDir: $(string),
		baseName: $(string)
	}
	*/

	this._debug( "_encode called with data of length " + data.length + " with options of " + JSON.stringify( opts ) );

	const _fileName = path.join( opts.tmpDir, opts.baseName + "-" + opts.frameCount + ".png" );

	const _options = {
		//version: 4,	// will dynamically detect
		errorCorrectionLevel: "low",
		scale: 1,
		//width: 800,
		margin: 0,
	};

	QRCode.toFile( _fileName, data.toString('base64'), _options, ( err ) => {
		if( err ){ return cb( err ); }
		return cb( null, _fileName );
	} );
};

LibQRV.prototype._decode = function( _path, cb ){
	// TODO
};

LibQRV.prototype.queueReadableStream = function( readableStream, cb ){
	async.waterfall( [ ( cb ) => {

		// Call a function that
		// checks the current length of the queue
		// against a limit that was imposed by the config
		//TODO
		return cb( null );

	}, ( cb ) => {

		// Shove the new readableStream into the queue..
		this._queue.push( readableStream );

		return cb( null );

	} ], cb );
};

LibQRV.prototype._initQueuePoll = function( ){
	
	async.whilst( ( cb ) => {

		return cb( null, !this._stopping && !this._stopped );

	}, ( cb ) => {

		// This function is called repeatedly checking
		// if there is anything in the queue for us to
		// start consuming on.. 

		// It continues to loop infinitely unless 
		// _stopping or _stopped is set to true ( or both ).
		if( this._queue.length == 0 ){
			return setTimeout( function( ){
				return cb( null );
			}, 1000 );
		}

		// Grab a single item off the queue
		const _readable = this._queue.shift( );
	
		this._handleReadable( _readable, ( err ) => {
			// In the future perhaps requeue this
			// readable somehow or something.. ideally
			// any error should be handled within handleReadable

			// At this point we should
			// ensure that we close readable..
			_readable.destroy()

			return cb( err );
		} );

	}, ( err ) => {
		if( err ){
			// There was some error that came out of
			// _handleReadable somewhere.. bail bail bail.
			return this._error( err );
		}

		// We've shut down or stopped, based on _stopping or _stopped
		// instance wide variables.
		
		//TODO serialize state so that we can pick up again where we left off.
		this.destroy( ( err ) => {
			if( err ){ this._error( err ); }
		});
	} );
};

// Takes a single readable stream and shoves it through
// incoming with some header/footer information
LibQRV.prototype._handleReadable = function( _readable, cb ){

	const filenameToUse = path.basename( _readable.path );

	this._debug( "_handleReadable " + filenameToUse );

	// This is used to capture all the outputs from
	// _encode calls; Note that right now we just 
	// throw out the filename (_path), since we can generate
	// the bunch of images using string matching.
	const cbImage = function( cb ){
		return function( err, _path ){
			if( err ){ return cb( err ); }
			return cb( null );
		};
	};

	const _tmpPath	= tmp.dirSync().name;
	const uuidToUse = uuidv4();

	let _currentFrame = 1;
	const opts = function( ){
		_currentFrame = _currentFrame+1;
		return {
			frameCount: _currentFrame,
			tmpDir: _tmpPath,
			baseName: uuidToUse
		};
	};

	async.waterfall( [ ( cb ) => {

		// Handle error listeners
		// on readable..
		_readable.once( "error", ( err ) => {
			// Because we're inside a waterfall
			// we don't return cb here..
			// instead we call _error which
			// will bail across the instance
			// not just _handleReadable.

			// Consider changing this in the future, as
			// this should be ideally localized to this 
			// function
			return this._error( err );
		} );

		return cb( null );

	}, ( cb) => {

		// Shove a header for _readable in..
		this._encode( Buffer.from( JSON.stringify(
			{ "type": "start_file", "filename": filenameToUse }
		) ), opts( ), cbImage( cb ) );
		
	}, ( cb ) => {

		_readable.pause();

		let _end = false;
		_readable.once( "end", ( ) => {
			_end = true;
		} );

		// Note that when we loop unroll this in the future
		// we're going to need to call opts() in series
		// and then apply those objects into a function that
		// calls _encode, as opts() auto increments the
		// frame count which is used for the filename.
		async.whilst( ( cb ) => {
			return cb( null, !_end );
		}, ( cb ) => {

			_readable.resume();
			// TODO should be changed to read based
			// on config..
			const data = _readable.read( 100 );
			this._debug( "_handleReadable read() " + filenameToUse );
			_readable.pause();

			if( data == null ){
				return setTimeout( ( ) => {
					return cb( null );
				}, 100 );
			}

			this._encode( data, opts( ), cbImage( cb ) );
		}, cb );

	}, ( cb ) => {

		// Shove a footer for _readable in..
		this._encode( Buffer.from( JSON.stringify(
			{ "type": "end_file", "filename": filenameToUse }
		) ), opts( ), cbImage( cb ) ); 

	}, ( cb ) => {

		const _opts = opts( );

		/*
		opts = {
			frameCounter: 
			tmpDir: "/path/to/tmp/dir",
			baseName: "uuid"
		}
		*/

		const ffmpegCmd = new FfmpegCommand( _opts.tmpDir + "/" + _opts.baseName + "-%d.png" ).inputOptions( [ "-r 1", "-f image2", "-pix_fmt yuv420p" ] ).output( _opts.tmpDir + "/output.mp4" );

		ffmpegCmd.once( "error", ( err ) => {
			return cb( err );
		} );

		ffmpegCmd.once( "end", ( ) => {
			ffmpegCmd.removeAllListeners();

			return cb( null, _opts.tmpDir );
		} );

		ffmpegCmd.run();

	}, ( tmpDir, cb ) => {

		// tmpDir + "/output.mp4" contains the video.
		
		this._doneReadable( filenameToUse, tmpDir + "/output.mp4", ( err ) => {
			if( err ){ return cb( err ); }
			return cb( null, tmpDir );
		} );

	}, ( tmpDirToRemove, cb ) => {

		rimraf( tmpDirToRemove, cb );

	} ], cb );
};

LibQRV.prototype._doneReadable = function( filenameToUse, _path, cb ){
	// Let's copy the output path (.mp4) file
	// so that the _handleReadable from where this is called
	// can go ahead and destroy any temporary directories.

	// It is assumed that this is the only place that 
	// _path ( output .mp4 ) is available.. after calling cb()
	// it will be removed.

	//TODO

	console.log( "Filename " + filenameToUse + " is located" );
	console.log( "I have path of " + _path );

	this.emit( "readableStreamComplete", {
		filename: filenameToUse,
		outputPath: _path
	} );

	return cb( null );
};

LibQRV.prototype._debug = function( what ){
	this.emit( "debug", what );
};

LibQRV.prototype._error = function( err ){
	//TODO, shutdown current instances,
	// close streams, save state, etc.

	// After doing what we can to save current state
	// for recovery, bail by emitting an error upstream
	this.emit( "error", err );
};

LibQRV.prototype.stop = function( cb ){
	this._stopping = true;

	// TODO perhaps wait for serialization
	
	this._stopped = true;

	if( typeof( cb ) == "function" ){
		return cb( null );
	}
};

LibQRV.prototype.destroy = function( cb ){

	async.waterfall( [ ( cb ) => {

		this.stop( cb );

	}, ( cb ) => {

		// Destroy any temporary directories
		// that may have existed
		//TODO

		this.removeAllListeners();

		return cb( null );
	} ], cb );
	
};
module.exports = LibQRV;
