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
			const z = new LibQRV( { }, ( err, result ) => {
				if( err ){ return cb( err ); }

				/*
				{
					inEmitter: $(eventEmitter),
					done: $(function)
				}
				*/
				assert.ok( typeof( result.done ) == "function" );
				assert.ok( result.inEmitter instanceof events.EventEmitter );
				return cb( null );
			} );
		} );
	} );
} );
