const LibQRV = require( "../lib/index" );

const assert = require( "assert" );

describe( "Base", function( ){
	it.only( "LibQRV is a function", function( ){
		assert.ok( typeof( LibQRV ) == "function" );
	} );
} );
