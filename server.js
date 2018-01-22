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
var user_size_x = 100;
var user_size_y = 100;
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

        socket.user = {pseudo:pseudo,
                        x_pos:0,
                        y_pos:480,
                        x_size:user_size_x,
                        y_size:user_size_y,
                        color:getRandomColor(),
        }
        var registry_new_entry = socket.user.pseudo;
        user_registry[registry_new_entry] = socket.user;
        io.emit('new_player',{pseudo:socket.user.pseudo,
                              color:socket.user.color,
                              registry:user_registry,
                              prop_registry:props_registry,
                            }
        );
    });

    socket.on('update_player_pos',function(data){
          if(socket.user.x_pos + (data.x) >= 0 && socket.user.x_pos + (data.x) <= space_x_length  ){
              socket.user.x_pos = socket.user.x_pos + (data.x);
          }
          if(socket.user.y_pos + (data.y) >= 0 && socket.user.y_pos + (data.y) <= space_y_length  ){
              socket.user.y_pos = socket.user.y_pos + (data.y);
          }
        checkUserPropsColision(socket.user);
        io.emit('players_pos_update',{pseudo:socket.user.pseudo,
                x_pos:socket.user.x_pos,
                y_pos:socket.user.y_pos});
          user_registry[socket.user.pseudo] = socket.user;

          generateNewProps = getRandomInt(99);
          if(generateNewProps == 50){
              newPropsGenerated = generateRandomProps();
              io.emit('new_props_generated',newPropsGenerated);
              console.log("propsgenerated");
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
               /* console.log("----------------------------------")
                console.log((prop.y_pos+10)+" --  "+(prop.x_pos+5));
                console.log(user.y_pos+" ---"+(user.y_pos + user.y_size));
                console.log(user.x_pos+" ---"+(user.x_pos + user.x_size));
                console.log("----------------------------------")*/
                if((prop.y_pos+10) >= user.y_pos && (prop.y_pos+10) <= (user.y_pos+user.y_size)){
                    if((prop.x_pos+5) >= user.x_pos && (prop.x_pos+5) <= (user.x_pos+user.x_size)){
                        prop.available = 0;
                        //console.log("Props colision");
                        if(prop.type == 1){
                            user.x_size -= 10;
                            user.y_size -= 10;
                        }else{
                            user.x_size += 10;
                            user.y_size += 10;
                        }
                        io.emit('user_prop_colision',{prop:prop,
                        user:user,
                        });
                        props_registry[prop.id] = prop;
                        user_registry[user.pseudo] = user;
                    }
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
