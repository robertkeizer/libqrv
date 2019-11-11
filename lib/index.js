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

	async.waterfall( [ ( cb ) => {

		Joi.validate( _config, Joi.object( ).keys( {
			tmpDirectory: Joi.string( ).default( ( ) => {
				return tmp.dirSync( );
			}, "Uses tmp.dirSync node module." ),
			debug: Joi.boolean( ).default( false )
		} ), cb );

	}, ( validConfig, cb ) => {

		this.config = validConfig;

		this._setupIncomingEmitter( );

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

		// Grab a single item off the queue
		const _readable = this._queue.shift( );
		
		this._handleReadable( _readable, ( err ) => {
			
		} );

	}, ( err ) => {
		
	} );
};

// Takes a single readable stream and shoves it through
// incoming with some header/footer information
LibQRV.prototype._handleReadable = function( _readable ){
	async.waterfall( [ ( cb ) => {

		// Shove a header for _readable in..
	}, ( cb ) => {

		// Let's iterate through _readable and shove
		// the contents through.

	}, ( cb ) => {

		// Shove a footer for _readable in..
	} ], cb );
};

LibQRV.prototype._incoming = function( data ){

	this._debug( "_incoming data called" );

	async.waterfall( [ ( cb ) => {
		
	} ], ( err ) => {
		
	} );
};

LibQRV.prototype._debug = function( what ){
	this.emit( "debug", what );
};

LibQRV.prototype._done = function( cb ){
	
};

module.exports = LibQRV;
