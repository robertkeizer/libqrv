const util	= require( "util" );
const events	= require( "events" );
const path	= require( "path" );
const fs	= require( "fs" );

const async	= require( "async" );
const Joi	= require( "joi" );
const tmp	= require( "tmp" );
const uuidv4	= require( "uuid/v4" );

const QRCode	= require( "qrcode" );
const quirc	= require( "node-quirc" );

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

LibQRV.prototype._encode = function( data, cb ){
	// This exists as an abstraction method
	// for later use. Specifically different 
	// kinds of encoding/decoding can be used
	// later, based on config.

	const _fileName = path.join( this.config.tmpDirectory, uuidv4() + ".png" );

	const _options = {
		//version: 4,	// will dynamically detect
		errorCorrectionLevel: "low",
		scale: 1,
		width: 800
	};

	QRCode.toFile( _fileName, data.toString('base64'), _options, ( err ) => {
		if( err ){ return cb( err ); }
		return cb( null, _fileName );
	} );
};

LibQRV.prototype._decode = function( _path, cb ){

	async.waterfall( [ ( cb ) => {
		fs.readFile( _path, cb );
	}, ( data, cb ) => {
		quirc.decode( data, cb );
	}, ( codes, cb ) => {
		if( codes.length > 1 ){
			return cb( "multiple_qr_detected" );
		}
		return cb(null, codes[0].data );
	} ], cb );

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
	} );
};

// Takes a single readable stream and shoves it through
// incoming with some header/footer information
LibQRV.prototype._handleReadable = function( _readable, cb ){

	const filenameToUse = path.basename( _readable.path );

	const listOfImages = [ ];

	// Function that creates a helper function
	// based on the callback. Specifically this is
	// used when we call _incoming and want to keep track
	// of the paths of the images that it returns, but 
	// we don't want to process them right away.

	const addToList = function( cb ){
		return function( err, path ){
			if( err ){ return cb( err ); }
			listOfImages.push( path );
			return cb( null );
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
		this._incoming( Buffer.from( JSON.stringify(
			{ "type": "start_file", "filename": filenameToUse }
		) ), addToList( cb ) );
		
	}, ( cb ) => {

		_readable.pause();

		let _end = false;
		_readable.once( "end", ( ) => {
			_end = true;
		} );

		async.whilst( ( cb ) => {
			return cb( null, !_end );
		}, ( cb ) => {

			_readable.resume();
			// TODO should be changed to read based
			// on config..
			const data = _readable.read( 1024 );
			_readable.pause();

			if( data == null ){
				return setTimeout( ( ) => {
					return cb( null );
				}, 100 );
			}

			this._incoming( data, addToList( cb ) );
		}, cb );

	}, ( cb ) => {

		// Shove a footer for _readable in..
		this._incoming( Buffer.from( JSON.stringify(
			{ "type": "end_file", "filename": filenameToUse }
		) ), addToList( cb ) ); 

	}, ( cb ) => {

		// At this point we have a bunch of image paths
		// buffered up in listOfImages[] .. we should
		// go through them ( IN ORDER ) and create a single
		// video.

		// For extremely large files this should be split
		// out and handled in parallel, whereby we would start
		// this process of creating a video stream while we're
		// still processing the video.

		console.log( listOfImages );

		const _last = listOfImages[listOfImages.length-1];
		
		this._decode( _last, ( err, result ) => {
			console.log( "I HAVE ERR OF" );
			console.log( err );
			console.log( "DATA OF LAST IS " );
			console.log( result );
			return cb( null );
		} );

	} ], cb );
};

LibQRV.prototype._incoming = function( data, cb ){
	
	this._debug( "_incoming data called with data of length " + data.length );

	async.waterfall( [ ( cb ) => {

		this._encode( data, cb );

	} ], cb );
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
		return cb( null );
	} ], cb );
	
};
module.exports = LibQRV;
