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

	it.only( "Constructor returns sane object in callback", function( cb ){
		
	} );
} );
