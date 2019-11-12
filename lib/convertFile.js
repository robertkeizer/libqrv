const fs	= require( "fs" );
const async	= require( "async" );
const LibQRV	= require( "./libqrv" );

const convertFile = function( filename, newFilename, cb ){
	
	// Allow for newFilename to not be specified.
	if( typeof( cb ) == "undefined" && typeof( newFilename ) == "function" ){
		cb = newFilename;
		newFilename = filename + ".mp4";
	}
	
	async.waterfall( [ ( cb ) => {

		// Create the new instance of libqrv; Go ahead
		// and shove the new readable stream into it.
		new LibQRV( { }, ( err, libqrvInst ) => {

			libqrvInst.once( "readableStreamComplete", ( details ) => {
				return cb( null, details, libqrvInst );
			} );

			libqrvInst.queueReadableStream( fs.createReadStream( filename ), ( err ) => {
				if( err ){ return cb( err ); }
			} );
		} );

	}, ( details, libqrvInst, cb ) => {

		// At this point we know libqrv has processed the data
		// for the readable stream ( we've only shoved one in,
		// so we're good to go ).

		// Copy the temporary file to the proper external filename.
		fs.copyFile( details.outputPath, newFilename, ( err ) => {
			if( err ){ return cb( err ); }
			return cb( null, details, libqrvInst );
		} );

	}, ( details, libqrvInst, cb ) => {

		// Cleanup everything we can about the 
		// system, including the 
		fs.unlink( details.outputPath, ( err ) => {
			if( err ){ return cb( err ); }
			libqrvInst.destroy( cb );
		} );
		
	} ], cb );
};

module.exports = convertFile;
