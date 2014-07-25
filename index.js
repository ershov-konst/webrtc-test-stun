var
   express = require('express'),
   app = express(),
   server = require('http').Server(app),
   io = require('socket.io')(server),
   dot = require('dot'),
   uuid = require('node-uuid'),
   fs = require('fs');


app.use('/static', express.static(__dirname + '/static'));
app.get('/', function (req, res) {
   fs.readFile(__dirname + '/static/index.html', 'utf8', function(err, file){
      if (err){
         res.error(err);
      }
      else{
         var dotTpl = dot.template(file);
         res.send(dotTpl({
            uuid: uuid.v4()
         }));
      }
   });
});

function updateContactList(){
   io.emit(
      'contacts',
      io.sockets.sockets
         .map(function(elem){
            return elem.id;
         })
   );
}

io.on('connection', function (socket) {
   socket.emit('id', socket.id);
   updateContactList();


   socket.on('invite', function(data){
      data.from = socket.id;
      io.sockets.connected[data.to].emit('invite',  data);
   });

   socket.on('ack', function(data){
      data.from = socket.id;
      io.sockets.connected[data.to].emit('ack', data);
   });

   socket.on('offer', function(data){
      data.from = socket.id;
      io.sockets.connected[data.to].emit('offer', data);
   });

   socket.on('answer', function(data){
      data.from = socket.id;
      io.sockets.connected[data.to].emit('answer', data);
   });

   socket.on('ices', function(data){
      data.from = socket.id;
      io.sockets.connected[data.to].emit('ices', data);
   });

});

server.listen(process.env.PORT || 5000);