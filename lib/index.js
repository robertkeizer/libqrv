const util	= require( "util" );
const events	= require( "events" );

const async	= require( "async" );
const Joi	= require( "joi" );
const tmp	= require( "tmp" );

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
				return tmp.dirSync( );
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

		console.log( "I have this._queue of " );
		console.log( this._queue );


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
		//TODO
		return cb( null );
		
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
			const data = _readable.read();
			_readable.pause();

			if( data == null ){
				return setTimeout( ( ) => {
					return cb( null );
				}, 100 );
			}

			this._incoming( data, cb );
		}, cb );

	}, ( cb ) => {

		console.log( "GOT TO FOOTER IN HANDLE READBLE" );
		// Shove a footer for _readable in..
		//TODO
		return cb( null );

	} ], cb );
};

LibQRV.prototype._incoming = function( data, cb ){
	
	console.log( "INCOMING: " );
	console.log( data );

	this._debug( "_incoming data called with data of length " + data.length );

	async.waterfall( [ ( cb ) => {

		return cb( null );

	} ], ( err ) => {

		return cb( err );
	} );
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
