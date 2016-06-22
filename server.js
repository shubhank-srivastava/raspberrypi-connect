var net = require('net');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({}));
app.use(methodOverride());
app.use(cookieParser());
app.use(express.static(__dirname + '/'));
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
var Customer = require('./server/customer.model');
if(!process.env.NODE_ENV) process.env.NODE_ENV = 'local'; 
var config = require('./config/'+process.env.NODE_ENV+'.js');
http.listen(config.HTTP_PORT);

mongoose.connect(config.mongo.uri, {});

console.log('RPI Server listening on ' + config.HOST +':'+ config.PORT);
console.log('HTTP Server listening on '+config.HOST +':'+ config.HTTP_PORT);

var RPI = {};

net.createServer(function(sock) {
    console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
    
    sock.on('data', function(data) {
        if(!RPI[sock.remoteAddress]){
            if(data.toString().indexOf('auth')==0){
                var auth = data.toString().split(" ");
                Customer.findOne({username: auth[1]}, function(err, customer){
                    if(err){
                        console.log(err);
                        sock.end();
                    }if(!customer){
                        console.log("username doesn't exist.");
                        sock.end();
                    }else if(!customer.authenticate(auth[2])){
                        console.log("password failed for username:"+auth[1]);
                        sock.end();
                    }else{
                        for(var ip in RPI){
                            if(RPI[ip].username==auth[1]){
                                delete RPI[ip];
                                break;
                            }
                        }
                        RPI[sock.remoteAddress]={};
                        RPI[sock.remoteAddress].tcp = sock;
                        RPI[sock.remoteAddress].authenticated = true;
                        RPI[sock.remoteAddress].username = auth[1];
                        RPI[sock.remoteAddress].socketid = null;
                        console.log('authenticated:'+auth[1]);
                    }
                });
            }else
                sock.end();
        }else{
            if(data.toString()=="namaste"){
                RPI[sock.remoteAddress].heartbeat = new Date();
            }else {
                var data = data.toString();
                try{
                    if(RPI[this.remoteAddress].socketid!=null){
                        io.sockets.connected[RPI[this.remoteAddress].socketid].emit('terminal-cmd-output', {message:data.toString()});
                    }
                }catch(error){
                    console.log("Error thrown");
                }
            }
        }
    });
    
    sock.on('error', function(error){
        console.log(sock.remoteAddress);
        delete RPI[this.remoteAddress];
    });

    sock.on('close', function(data) {
        console.log('CLOSED:'+this.remoteAddress);
        delete RPI[this.remoteAddress];
    });
    
}).listen(config.PORT, config.HOST);

/***************************WEBSOCKETS********************************/
io.sockets.on('connection',function (socket){
   	console.log('A client connected:'+socket.id);
    
    socket.on('terminal-connect', function(rpi){
        if(RPI[rpi.remoteAddress].socketid==null){
            RPI[rpi.remoteAddress].socketid=socket.id;
            io.sockets.emit('update-rpi-lock', {remoteAddress:rpi.remoteAddress, socketid: socket.id});
        }else
            socket.emit('terminal-error', 'Not accesible currently. Someone else is connected.');
    });

    socket.on('terminal-cmd-input', function(cmd){
        console.log(cmd.message);
    	if(RPI[cmd.remoteAddress]!=null)
    		RPI[cmd.remoteAddress].tcp.write(new Buffer(cmd.message));
        else
            socket.emit('terminal-error', 'Not accessible currently. PI is down.');
    });

    socket.on('connected-rpis', function(){
        var rpi = [];
        for(var key in RPI){
            rpi.push({
                remoteAddress: RPI[key].tcp.remoteAddress,
                username: RPI[key].username,
                socketid: RPI[key].socketid
            });
        }
        socket.emit('connected-rpis', {rpi: rpi});
    });

    socket.on('close_terminal', function(data){
        RPI[data.remoteAddress].socketid = null;
        io.sockets.emit('update-rpi-lock', {remoteAddress:data.remoteAddress, socketid:null});
    });
});

io.sockets.on('disconnect',function (socket){
    for(var ip in RPI){
        if(RPI[ip].socketid==socket.id){
            RPI[ip].socketid=null;
            break;
        }
    }
});
/***********************ECHO SERVER*******************************/
setInterval(function(){
    for(var ip in RPI)
        RPI[ip].tcp.write(new Buffer("namaste"));
},30000);

/********************CONVENIENCE ROUTES**************************/
app.get('/api/pi', function(req, res){
    var rpi = [];
        for(var key in RPI){
            rpi.push({
                remoteAddress: RPI[key].tcp.remoteAddress,
                username: RPI[key].username,
                socketid: RPI[key].socketid,
                heartbeat: RPI[key].heartbeat
            });
        }
        res.json(rpi);
});

var fs = require('fs');
app.post('/api/user', function(req, res){
    var newCustomer = new Customer(req.body);
    newCustomer.save(function(err, user) {
        if (err){
            console.log(err);
            res.status(422).json(err);
        }else{
            fs.readFile('client.js', 'utf8', function(err,data){
                if(err)
                    console.log(err);
                else{
                    var username=data.match(/USERNAME='(.*?)'/);
                    var password=data.match(/PASSWORD='(.*?)'/);
                    data=data.replace(username[0],"USERNAME='"+req.body.username+"'");
                    data=data.replace(password[0],"PASSWORD='"+req.body.password+"'");
                    res.send(data);
                }
            });
        }            
    });
});
