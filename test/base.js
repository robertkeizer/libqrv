const events	= require( "events" );

const LibQRV = require( "../lib/index" );

const assert = require( "assert" );

describe( "Base", function( ){
	it( "LibQRV is a function", function( ){
		assert.ok( typeof( LibQRV ) == "function" );
	} );

	describe( "Validations", function( ){
		it( "Fails if an invalid config is passed in", function( cb ){
			const z = new LibQRV( { "foo": "bar" }, ( err ) => {
				if( !err ){ return cb( "No error" ); }
				return cb( null );
			} );
		} );
	} );

	describe( "Basic operation", function( ){
		it( "Constructor returns sane object in callback", function( cb ){
			new LibQRV( { }, ( err, libQRV ) => {
				if( err ){ return cb( err ); }

				assert.ok( libQRV instanceof LibQRV );

				return cb( null );
			} );
		} );

		it( "Emits debug events if enabled", function( cb ){

			async.waterfall( [ ( cb ) => {
				new LibQRV( {
					debug: true
				}, cb );
			}, ( libQRV, cb ) => {
				libQRV.once( "debug", ( what ) => {
					return cb( null, libQRV );
				} );

				const _readStream = fs.createReadStream( "./base.js" );

				libQRV.queueReadableStream( _readStream, ( err ) => {
					if( err ){ return cb( err ); }
				});

			}, ( libQRV, cb ) => {

				// TODO teardown of the libQRV instance
				return cb( null );
			}, cb );
		} );
	} );
} );
