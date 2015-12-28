var express = require('express'),
    expressApp = express(),
    socketio = require('socket.io'),
    http = require('http'),
    server = http.createServer(expressApp),
    uuid = require('node-uuid'),
    rooms = {},
    userIds = {};

exports.run = function (config) {

  server.listen(config.PORT);
  console.log('Listening on', config.PORT);
  socketio.listen(server, { log: false })
  .on('connection', function (socket) {

    var currentRoom, id;

    socket.on('init', function (data, fn) {
		function createRoom(roomId) {
			var currentRoom = roomId || uuid.v4();
			
			rooms[currentRoom] = [socket];
			id = userIds[currentRoom] = 0;
			fn(currentRoom, id);
			console.log('Room created, with #', currentRoom);
			
			return currentRoom;
		}
		
		
		if (data === undefined || data.room === undefined) {
			createRoom();
		} 
		else {
			currentRoom = data.room;
			
			if (rooms[currentRoom] === undefined) {
				currentRoom = createRoom(currentRoom);
			}
			
			var room = rooms[currentRoom];
			
			userIds[currentRoom] += 1;
			id = userIds[currentRoom];
			fn(currentRoom, id);
			room.forEach(function (s) {
			  s.emit('peer.connected', { id: id });
			});
			room[id] = socket;
			console.log('Peer connected to room', currentRoom, 'with #', id);
		}
    });

    socket.on('msg', function (data) {
      var to = parseInt(data.to, 10);
      if (rooms[currentRoom] && rooms[currentRoom][to]) {
        console.log('Redirecting message to', to, 'by', data.by);
        rooms[currentRoom][to].emit('msg', data);
      } else {
        console.warn('Invalid user');
      }
    });

    socket.on('disconnect', function () {
      if (!currentRoom || !rooms[currentRoom]) {
        return;
      }
	  
      delete rooms[currentRoom][rooms[currentRoom].indexOf(socket)];
      
	  rooms[currentRoom].forEach(function (socket) {
        if (socket) {
          socket.emit('peer.disconnected', { id: id });
        }
      });
    });
  });
};
