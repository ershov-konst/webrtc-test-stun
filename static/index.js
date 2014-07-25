$(function(){

   var
      socketId = null,
      peerConnection = null,
      interlocutor = null,
      interlocutorIces,
      selfIces = [];

   function fillTable(data){
      var
         t = $('#contacts'),
         html = '';

      data
         .filter(function(elem){
            return elem != socketId;
         })
         .forEach(function(elem){
            html += '<tr><td>' + elem + '</td></tr>';
         });

      t.html(html);
   }

   function obtainLocalMedia(cb){
      navigator.webkitGetUserMedia({audio: true, video: true}, function(localMediaStream){
         var video = document.querySelectorAll('.localVideoContainer video')[0];
         video.src = window.URL.createObjectURL(localMediaStream);
         video.onloadedmetadata = function(){
            cb(localMediaStream);
         };

      }, console.error);
   }

   function setRemoteMedia(e) {
      console.log('onaddstream');
      var stream = e.stream;
      var video = document.querySelectorAll('#remoteVideo')[0];
      video.src = window.URL.createObjectURL(stream);
   }

   function onIcesCandidate(event) {
      console.log('onicecandidate :: ', event.candidate);
      if (event.candidate) {
         selfIces.push(event.candidate);
      }
      else {
         socket.emit('ices', {
            to: interlocutor,
            ices: selfIces
         });
         console.log('sendIces', interlocutor);
      }
   }

   function onIceConnectionStateChange() {
      console.log('oniceconnectionstatechange :: ', peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'connected') {
         $('#closeConnection').show().on('click', function () {
            peerConnection.close();
         });
      }
   }

   function createPeerConnection(stream, cb){
      var pc = peerConnection = new webkitRTCPeerConnection({
         iceServers: [
            {
               'url': 'stun:turn.sbis.ru'
            },
            {
               'url': 'turn:turn.sbis.ru',
               'username': 'myuser',
               'credential': 'mypass'
            }
         ]
      });
      console.log('createPeerConnection');

      pc.addStream(stream);

      pc.onaddstream = setRemoteMedia;

      pc.onicecandidate = onIcesCandidate;

      pc.oniceconnectionstatechange = onIceConnectionStateChange;

      cb(pc);
   }


   var socket = io.connect('/');
   socket.on('id', function(id){
      socketId = id;
   });
   socket.on('contacts', function(data){
      fillTable(data);
   });

   $('#contacts').delegate('tr', 'click', function(){
      socket.emit('invite', {to: this.textContent});
      interlocutor = this.textContent;
   });


   socket.on('invite', function(data){
      if(window.confirm('Входящий звонок! Будем разговаривать?')){
         socket.emit('ack', {to: data.from});
         interlocutor = data.from;
      }
      else{
         socket.emit('cancel', {to: data.from});
      }
   });


   socket.on('ack', function(data){
      obtainLocalMedia(function(stream){
         createPeerConnection(stream, function(pc){

            pc.createOffer(function(offer){
               console.log('createOffer');
               pc.setLocalDescription(new RTCSessionDescription(offer), function() {
                  console.log('setLocalDescription');
                  socket.emit('offer', {
                     offer: offer,
                     to: data.from
                  })

               }, console.error);

            });

         })

      });
   });

   socket.on('offer', function(data){
      obtainLocalMedia(function(stream){
         createPeerConnection(stream, function(pc){

            pc.setRemoteDescription(new RTCSessionDescription(data.offer), function(){
               console.log('setRemoteDescription');
               processIces();
               pc.createAnswer(function(answer){
                  console.log('createAnswer');
                  pc.setLocalDescription(new RTCSessionDescription(answer), function() {
                     console.log('setLocalDescription');
                     socket.emit('answer', {
                        answer: answer,
                        to: data.from
                     })

                  }, console.error);
               });

            });

         })
      });
   });
   socket.on('answer', function(data){
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer), function(){
         processIces();
         console.log('setRemoteDescription');
      })
   });

   socket.on('ices', function(data){
      console.log('on Ices');
      interlocutorIces = data.ices;
      processIces();
   });

   function processIces() {
      if (interlocutorIces) {
         interlocutorIces.forEach(function (iceCandidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
         });
      }
   }
});

(function (log) {
   console.log = function () {
      Array.prototype.unshift.call(arguments, new Date().toJSON());
      log.apply(console, arguments);
   };
})(console.log);