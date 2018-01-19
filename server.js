var express = require('express');
var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent');

app.get('/', function(req,res){
    res.sendfile(__dirname+'/index.html');
});
app.use(express.static(__dirname + '/img'));
var space_x_length = 1000;
var space_y_length = 1000;
var user_size_x = 10;
var user_size_y = 20;
var user_registry = {};
io.sockets.on('connection', function(socket,pseudo){
    socket.on('nouveau_client',function(pseudo){
        if(pseudo == ""){
            pseudo = getRandomPseudo();
        }else{
            pseudo = ent.encode(pseudo);
        }

        socket.user = {pseudo:pseudo,
                        x_pos:0,
                        y_pos:480,
                        color:getRandomColor(),
        }
        var registry_new_entry = socket.user.pseudo;
        user_registry[registry_new_entry] = socket.user;
        console.log(user_registry);
        console.log(socket.user);
        io.emit('new_player',{pseudo:socket.user.pseudo,
                              color:socket.user.color,
                              registry:user_registry,
                            }
        );
    });

    socket.on('update_player_pos',function(data){
            console.log("update received");
            console.log(data);
          if(socket.user.x_pos + (data.x) >= 0 && socket.user.x_pos + (data.x) <= space_x_length  ){
              console.log("Ok update X"+data.x);
              socket.user.x_pos = socket.user.x_pos + (data.x);
          }
          if(socket.user.y_pos + (data.y) >= 0 && socket.user.y_pos + (data.y) <= space_y_length  ){
              console.log("Ok update Y"+data.y);
              socket.user.y_pos = socket.user.y_pos + (data.y);
          }
            io.emit('players_pos_update',{pseudo:socket.user.pseudo,
                x_pos:socket.user.x_pos,
                y_pos:socket.user.y_pos});
          user_registry[socket.user.pseudo] = socket.user;
          console.log(socket.user);
    });

    socket.on('message', function(message){
        message = ent.encode(message);
        socket.broadcast.emit('message', {pseudo: socket.user.pseudo, message: message});
    })
});

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 3; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    //color += color ;
    return color;
}
function getRandomPseudo() {
    var letters = '0123456789ABCDEF';
    var pseudo = 'Player-';
    for (var i = 0; i < 6; i++) {
        pseudo += letters[Math.floor(Math.random() * 16)];
    }
    return pseudo;
}
server.listen(1337);