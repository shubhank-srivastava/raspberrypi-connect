angular.module('piweb',['ngRoute']).config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {

    $routeProvider
      .when('/terminal/:ip', {
        templateUrl: 'public/views/terminal.html'
      })
      .when('/', {
        templateUrl: 'public/views/rpi-list.html'
      })
      .when('/new-device', {
        templateUrl: 'public/views/new-device.html'
      })
      .otherwise({
        redirectTo: '/'
      });

    $locationProvider.html5Mode(true);

}]).controller('terminalCtrl',['$scope','$routeParams','$window',function($scope,$routeParams,$window){
            
    var socket = io.connect();
    var remoteAddress = $routeParams.ip;
    $scope.show_file = false;
    var cmd_count=0, cmd_pointer=0;

    var term = new Terminal({
      cols: 100,
      rows: 24,
      screenKeys: true
    });
    term.open(document.getElementById('content'));

    term.write('\x1b[31mWelcome to terminal!\x1b[m\r\n');
    
    $scope.enter = function(e){
        if(e.keyCode == 13){
            socket.emit('terminal-cmd-input', {message:$scope.cmd+'\r', remoteAddress: remoteAddress});
            var isCat = $scope.cmd.match(/^cat (.*?)$/);
            if(isCat!=null){
                $scope.show_file=true;
                $scope.loading_file=true;
                $scope.file_name=isCat[1];
            }else if(isCat==null && $scope.show_file==true)
                $scope.hideFile();    
            localStorage.setItem(cmd_count, $scope.cmd);
            cmd_pointer=cmd_count+1;
            cmd_count+=1;
            $scope.cmd = '';
        }else if(e.keyCode == 38 && cmd_pointer!=0){
            cmd_pointer-=1;
            $scope.cmd = localStorage.getItem(cmd_pointer);
        }else if(e.keyCode == 40 && cmd_pointer!=cmd_count){
            cmd_pointer+=1;
            $scope.cmd = localStorage.getItem(cmd_pointer);
        }
    };

    $scope.hideFile = function(){
        $scope.show_file=false;
        $scope.loading_file=false;
        $scope.file_name='';
    };

    $scope.saveFile = function(){
        var txt = document.getElementById("file_contents").value;
        txt=txt.split("\n");
        var cmd = 'printf "'+txt[0]+'\n" | sudo tee '+ $scope.file_name+'\r';
        socket.emit('terminal-cmd-input', {message:cmd, remoteAddress: remoteAddress});
        for (var i=1;i<txt.length;i++) {
            var cmd = 'printf "'+txt[i]+'\n" | sudo tee -a '+ $scope.file_name+'\r';
            socket.emit('terminal-cmd-input', {message:cmd, remoteAddress: remoteAddress});
        };
        $scope.hideFile();
    };
    
    socket.emit('terminal-connect', {remoteAddress: remoteAddress});
    
    socket.on('update-rpi-lock', function(data){
        socket.emit('terminal-cmd-input', {message:'pwd\r', remoteAddress: remoteAddress});
    });

    socket.on('terminal-error', function(msg){
        alert(msg);
        $window.location.href = '/';
    });

    socket.on('terminal-cmd-output', function(data){
        term.write(data.message);
        if($scope.show_file==true){
            var t = data.message.slice(0,data.message.indexOf("]0;pi@raspberrypi:"));
            document.getElementById("file_contents").value = t;
            $scope.loading_file=false;
        }
    });

    $scope.close_terminal = function(){
        term.destroy();
        socket.emit('close_terminal',{remoteAddress: remoteAddress});
        localStorage.clear();
        $window.location.href = '/';
    };

}]).controller('RpiCtrl',['$scope','$interval',function($scope,$interval){

        var socket = io.connect();
        socket.emit('connected-rpis',{});
        $scope.loader = true;
        $interval(function(){socket.emit('connected-rpis',{});}, 5000);

        socket.on('connected-rpis', function(data){
            $scope.pis = data.rpi;
            $scope.loader = false;
            //console.log('Updated List');
        });

        socket.on('update-rpi-lock', function(data){
            for (var i = $scope.pis.length - 1; i >= 0; i--) {
                if($scope.pis[i].remoteAddress == data.remoteAddress){
                    $scope.pis[i].socketid = data.socketid;
                    break;
                }
            };
        });

    }
]).controller('NewDeviceCtrl', function ($scope, $http, $location) {
    $scope.user = {};
    $scope.errors = {};

    $scope.register = function(form) {
      $scope.submitted = true;
        $http.post('/api/user',{
          username: $scope.user.username,
          password: $scope.user.password
        })
        .success( function(data) {
          // Account created, redirect to home
          $scope.user.username = '';
          $scope.user.password = '';
          $scope.submitted = false;
          $scope.script = data;
          $scope.errors = {};
        })
        .error( function(err) {
          console.log(err);
          $scope.errors = {};
          // Update validity of form fields that match the mongoose errors
          angular.forEach(err.errors, function(error, field) {
            form[field].$setValidity('mongoose', false);
            $scope.errors[field] = error.message;
          });
        });
    };

  });
