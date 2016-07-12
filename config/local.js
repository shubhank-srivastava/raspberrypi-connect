
'use strict';

// Development specific configuration
// ==================================
module.exports = {
  	// MongoDB connection options
	mongo: {
		uri: 'mongodb://127.0.0.1:27017/raspberry'
	},
	//LAN IP
	HOST : '192.168.0.109',
	//PORT FOR PI's to connect
	PORT : 8000,
	//PORT for web app 
	HTTP_PORT: 3000
};

