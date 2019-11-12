const fs	= require( "fs" );
const events	= require( "events" );
const path	= require( "path" );

const LibQRV		= require( "../lib/index" ).LibQRV;
const convertFile	= require( "../lib/index" ).convertFile;

const async	= require( "async" );
const assert	= require( "assert" );

describe( "Base", function( ){
	it( "LibQRV is a function", function( ){
		assert.ok( typeof( LibQRV ) == "function" );
	} );

	describe( "Validations", function( ){
		it( "Fails if an invalid config is passed in", function( cb ){
			new LibQRV( { "foo": "bar" }, ( err, inst ) => {
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

				libQRV.destroy( cb );
			} );
		} );

		it( "Emits a 'readableStreamComplete' event when finished encoding a readable stream.", function( cb ){

			async.waterfall( [ ( cb ) => {
				new LibQRV( {
					debug: true
				}, cb );
			}, ( libQRV, cb ) => {

				libQRV.on( "debug", ( msg ) => {
					//console.log( msg );
				} );

				libQRV.once( "readableStreamComplete", ( details ) => {
					return cb( null, details, libQRV );
				} );

				const _readStream = fs.createReadStream( path.join( __dirname, "../", "yarn.lock" ) );

				libQRV.queueReadableStream( _readStream, ( err ) => {
					if( err ){ return cb( err ); }
				});

			}, ( details, libQRV, cb ) => {

				//console.log( "I have details of " );
				//console.log( details );
				

				// kill the instance and anything
				// that is has created ( tmp dirs, etc )
				libQRV.destroy( cb );

			} ], cb );
		} );
	} );

	describe( "convertFile operation", function( ){
		it( "Works when we specify a filename", function( cb ){

			const filePath = path.join( __dirname, "../yarn.lock" );
			const destPath = path.join( __dirname, "../example-yarn.lock.mp4" );

			convertFile( filePath, destPath, ( err ) => {
				if( err ){ return cb( err ); }

				fs.stat( destPath, ( err, stats ) => {
					if( err ){ return cb( err ); }

					if( !stats.isFile() ){
						return cb( "Not a file" );
					}

					fs.unlink( destPath, ( err ) => {
						if( err ){ return cb( err ); }
						return cb( null );
					} );
				} );
			} );
		} );

		it( "Works when we don't specify a filename", function( cb ){

			const filePath = path.join( __dirname, "../yarn.lock" );

			convertFile( filePath, ( err ) => {
				if( err ){ return cb( err ); }

				fs.stat( filePath + ".mp4", ( err, stats ) => {
					if( err ){ return cb( err ); }

					if( !stats.isFile() ){
						return cb( "Not a file" );
					}

					fs.unlink( filePath + ".mp4", ( err ) => {
						if( err ){ return cb( err ); }
						return cb( null );
					} );
				} );
			} );
		} );

	} );
} );
