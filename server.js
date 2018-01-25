var express = require('express');
var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent');

app.get('/', function(req,res){
    res.sendfile(__dirname+'/index.html');
});
app.use(express.static(__dirname + '/img'));
app.use(express.static(__dirname + '/sound'));
var space_x_length = 4000;
var space_y_length = 2000;
var user_size_x = 100;
var user_size_y = 100;
var prop_size_x = 20;
var prop_size_y = 20;
var user_registry = {};
var props_registry = {};
var props_last_id = 0;
io.sockets.on('connection', function(socket,pseudo){
    socket.on('nouveau_client',function(pseudo){
        if(pseudo == ""){
            pseudo = getRandomPseudo();
        }else{
            pseudo = ent.encode(pseudo.replace("/[^0-9a-zA-Z-\/_]/",''));
        }
        var now = new Date();
        now = Math.floor(now/1000);
        socket.user = {pseudo:pseudo,
                        x_pos:getRandomInt(space_x_length),
                        y_pos:getRandomInt(space_y_length),
                        x_size:user_size_x,
                        y_size:user_size_y,
                        score:0,
                        last_donut_ate: now,
                        color:getRandomColor(),
        }
        var registry_new_entry = socket.user.pseudo;
        user_registry[registry_new_entry] = socket.user;
        io.emit('new_player',{user:socket.user,
                            pseudo:socket.user.pseudo,
                              color:socket.user.color,
                              registry:user_registry,
                              prop_registry:props_registry,
                              space_x_length:space_x_length,
                              space_y_length:space_y_length
                            }
        );
    });

    socket.on('update_player_pos',function(data){
        speed_bonus = 0;
        if(socket.user.y_size < user_size_y && socket.user.x_size < user_size_x){
            speed_bonus = (user_size_x - socket.user.x_size)/10;
        }
          if((socket.user.x_pos+socket.user.x_size) + (data.x) >= 0 && (socket.user.x_pos+socket.user.x_size) + (data.x+speed_bonus) <= space_x_length  ){
            if(data.x > 0){
                socket.user.x_pos = socket.user.x_pos + (data.x+speed_bonus);
            }
            if(data.x < 0){
                socket.user.x_pos = socket.user.x_pos + (data.x+(-speed_bonus));
            }
          }
          if((socket.user.y_pos+socket.user.y_size) + (data.y) >= 0 && (socket.user.y_pos+socket.user.y_size) + (data.y+speed_bonus) <= space_y_length  ){
              if(data.y > 0){
                  socket.user.y_pos = socket.user.y_pos + (data.y+speed_bonus);
              }
              if(data.y < 0){
                  socket.user.y_pos = socket.user.y_pos + (data.y+(-speed_bonus));
              }
          }
        checkUserPropsColision(socket.user);
        checkPlayersColision(socket.user);
        var datecheck = new Date();
        datecheck = Math.floor(datecheck/1000);
        if((datecheck - socket.user.last_donut_ate) > 30 && socket.user.y_size > user_size_y ){
            socket.user.x_size -= 10;
            socket.user.y_size -= 10;
            io.emit('player_size_update',{user:socket.user});
        }
        io.emit('players_pos_update',{pseudo:socket.user.pseudo,
                x_pos:socket.user.x_pos,
                y_pos:socket.user.y_pos,
            score:socket.user.score});
          user_registry[socket.user.pseudo] = socket.user;
            socket.emit('update_your_position',{user:socket.user});
          generateNewProps = getRandomInt(99);
          if(generateNewProps == 50){
              newPropsGenerated = generateRandomProps();
              io.emit('new_props_generated',newPropsGenerated);
          }
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

function generateRandomProps() {
    var Props = {}
    //0 = bonus 1 = malus
    Props.type = getRandomInt(2);
    Props.x_size = prop_size_x;
    Props.y_size = prop_size_y;
    Props.y_pos = getRandomInt(space_y_length);
    Props.x_pos = getRandomInt(space_x_length);
    Props.id = "props_"+props_last_id;
    props_last_id++;
    Props.available = 1;

    props_registry[Props.id] = Props;

    return Props;
}

function checkUserPropsColision(user){
    if(Object.keys(props_registry).length !== 0){
       Object.keys(props_registry).map(function(key,index){
           var prop = props_registry[key];
            if(prop.available == 1){
                if(prop.x_pos < (user.x_pos+user.x_size) &&
                (prop.x_pos+prop.x_size) > user.x_pos &&
                    prop.y_pos < (user.y_pos+user.y_size) &&
                (prop.y_pos+prop.y_size) > user.y_pos){

                        prop.available = 0;
                        //console.log("Props colision");
                        if(prop.type == 1){
                            user.x_size -= 10;
                            user.y_size -= 10;
                            user.score -= 1;
                        }else{
                            var now = new Date();
                            now = Math.floor(now/1000);
                            user.x_size += 10;
                            user.y_size += 10;
                            user.score += 1;
                            user.last_donut_ate = now;
                            console.log("now"+now);
                        }
                        io.emit('user_prop_colision',{prop:prop,
                        user:user,
                        });
                        props_registry[prop.id] = prop;
                        user_registry[user.pseudo] = user;
                    }
            }
        });
    }
}

function checkPlayersColision(user){
    if(Object.keys(user_registry).length !== 0){
        Object.keys(user_registry).map(function(key,index) {
            var userR = user_registry[key];
            if(userR.pseudo != user.pseudo){
               if(userR.x_pos < (user.x_pos+user.x_size) &&
                  (userR.x_pos+userR.x_size) > user.x_pos &&
                  userR.y_pos < (user.y_pos+user.y_size) &&
                  (userR.y_pos+userR.y_size) > user.y_pos

                    ){
                          if(userR.x_size < user.x_size){
                              userR.x_size -= 10;
                              userR.y_size -= 10;
                              userR.score -= 10;
                              user.x_size += 10;
                              user.y_size += 10;
                              user.score += 10;
                              userR.y_pos = getRandomInt(space_y_length);
                              userR.x_pos = getRandomInt(space_x_length);
                          }else{
                              user.x_size -= 10;
                              user.y_size -= 10;
                              user.score -= 10;
                              userR.x_size += 10;
                              userR.y_size += 10;
                              userR.score += 10;
                              user.y_pos = getRandomInt(space_y_length);
                              user.x_pos = getRandomInt(space_x_length);
                          }


                          io.emit('player_colision',{userR:userR,
                              user:user,
                          });
                          user_registry[user.pseudo] = user;
                          user_registry[userR.pseudo] = userR;
                      }
                }
        });
    }
}
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}


if(typeof process.env.PORT !== 'undefined'){
    server.listen(process.env.PORT || 8080);
}else{
    server.listen(1337);
}
