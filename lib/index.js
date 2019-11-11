const events	= require( "events" );

const async	= require( "async" );
const Joi	= require( "joi" );
const tmp	= require( "tmp" );

const LibQRV = function( _config, cb ){

	async.waterfall( [ ( cb ) => {

		Joi.validate( _config, Joi.object( ).keys( {
			tmpDirectory: Joi.string( ).default( ( ) => {
				return tmp.dirSync( );
			}, "Uses tmp.dirSync node module." )
		} ), cb );

	}, ( validConfig, cb ) => {

		this.config = validConfig;

		this._setupIncomingEmitter( );

		return cb( null, {
			inEmitter: this.incomingEmitter,
			done: ( ) => {
				this._done();
			}
		} );

	} ], cb );
};

LibQRV.prototype._setupIncomingEmitter = function( ){
	this.incomingEmitter = new events.EventEmitter( );

	this.incomingEmitter.on( "data", ( data ) => {
		this._incoming( data );
	} );
};

LibQRV.prototype._incoming = function( data ){
	console.log( "This is _incoming; I have data of " );
	console.log( typeof( data ) );
	console.log( data );
};

module.exports = LibQRV;
