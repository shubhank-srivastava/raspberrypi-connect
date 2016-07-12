
'use strict';

// Production specific configuration
// ==================================
module.exports = {
  // MongoDB connection options
	mongo: {
		uri: process.env.MONGOLAB_URI
	},

	HOST : process.env.HOST,
	
	PORT : process.env.RPI_PORT,

	HTTP_PORT: process.env.HTTP_PORT
};

