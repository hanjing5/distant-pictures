/*
server.js

Authors:David Goedicke (da.goedicke@gmail.com) & Nikolas Martelaro (nmartelaro@gmail.com)

This code is heavily based on Nikolas Martelaroes interaction-engine code (hence his authorship).
The  original purpose was:
This is the server that runs the web application and the serial
communication with the micro controller. Messaging to the micro controller is done
using serial. Messaging to the webapp is done using WebSocket.

//-- Additions:
This was extended by adding webcam functionality that takes images remotely.

Usage: node server.js SERIAL_PORT (Ex: node server.js /dev/ttyUSB0)

Notes: You will need to specify what port you would like the webapp to be
served from. You will also need to include the serial port address as a command
line input.
*/

var express = require('express'); // web server application
var app = express(); // webapp
var http = require('http').Server(app); // connects http library to server
var io = require('socket.io')(http); // connect websocket library to server
var serverPort = 8000;
var SerialPort = require('serialport'); // serial library
var Readline = SerialPort.parsers.Readline; // read serial data as lines
//-- Addition:
var NodeWebcam = require( "node-webcam" );// load the webcam module

// for face recognition
var https=require ('https');
var fs=require("fs");
var queryString = require('query-string');

//---------------------- WEBAPP SERVER SETUP ---------------------------------//
// use express to create the simple webapp
app.use(express.static('public')); // find pages in public directory

// check to make sure that the user provides the serial port for the Arduino
// when running the server
if (!process.argv[2]) {
  console.error('Usage: node ' + process.argv[1] + ' SERIAL_PORT');
  process.exit(1);
}

// start the server and say what port it is on
http.listen(serverPort, function() {
  console.log('listening on *:%s', serverPort);
});
//----------------------------------------------------------------------------//


function faceAnalysis(imageName, callback) {
    // Request parameters.
    var params = {
        "returnFaceId": "true",
        "returnFaceLandmarks": "false",
        "returnFaceAttributes": "age,gender,headPose,smile,facialHair,glasses,emotion,hair,makeup,occlusion,accessories,blur,exposure,noise",
        "subscription-key": ""
    };
    
    var stringified = queryString.stringify(params);
    console.log('stringify ', stringified);
    
    fs.readFile("/home/pi/distant-pictures/public/" + imageName, function(err, data) {
        if (err) {
            console.log("read jpg fail " + err);
        }
        else {
            var post_options = {
                host: 'westcentralus.api.cognitive.microsoft.com',
                method: 'POST',
                data: data,
                path: '/face/v1.0/detect?' + stringified ,
                // path: '/face/v1.0/detect?subscription-key=e46d6a4b665f41cc8a67e932b7aa57d4',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': data.length
                }
            };
            var post_req = https.request(post_options, function (response) {
                var responseText;
                response.on('data', function (rdata) {
                    responseText+=rdata;
                });
                response.on('end', function () {
		    var parsedText = eval(responseText.slice(9,responseText.length))
		    callback(parsedText[0]);
                    console.log(parsedText[0])
                });
            });
            post_req.write(data);
            post_req.end();
        }
    });
}

function rTtoHTML(rT){
if (rT == undefined){
return '';
}
	var faceAttributes = rT['faceAttributes'];
	var resultText = "These are our best guesses:<br>"
	console.log(faceAttributes);
	var age = faceAttributes.age;
	resultText += "You are <font size=6>" + age + "</font> years old.<br>";
	var gender = faceAttributes.gender;
	resultText += "Your gender is <font size=6>" + gender + "</font>.<br>";

	var glasses = faceAttributes.glasses;

	if (glasses === "NoGlasses") {
		resultText += "You are not wearing glasses.<br>"
	} else {
		resultText += "You are wearing glasses.<br>"
	}

	var emotion = faceAttributes.emotion;
	var aWord = '...we have no idea';
	var eState = Object.keys(emotion).reduce(function(a, b){ return emotion[a] > emotion[b] ? a : b });
	console.log(eState);
	switch(eState) {
	    case "anger":
	        aWord = "angry"
	        break;
	    case "contempt":
	    	aWord = "contempt"
	    	break;
	    case "disgust":
	    	aWord = "disgusted"
	    	break;
	    case "fear":
	    	aWord = "fearful"
	    	break;
	    case "happiness":
	    	aWord = "happy"
	    	break;
	    case "neutral":
	    	aWord = "neutral"
	    	break;
	    case "sadness":
	    	aWord = "sad"
	    	break;
	    case "surprise":
	    	aWord = "surprised"
	    	break;
	}
	resultText += "You are feeling <font size=6>" + aWord  + "</font>.<br>"

	var makeup = faceAttributes.makeup;
	if (makeup.eyeMakeup || makeup.lipMakeup ) {
		resultText += "You appear to have makeup on?<br>"
	}

	var smile = faceAttributes.smile;
	if (smile > 0.5) {
		resultText += "You appear to be <font size=6>smiling</font>. It's good to be happy!<br>"
	}
	console.log(resultText);
	return resultText;
}
//--Additions:
//----------------------------WEBCAM SETUP------------------------------------//
//Default options
var opts = { //These Options define how the webcam is operated.
    //Picture related
    width: 1280, //size
    height: 720,
    quality: 100,
    //Delay to take shot
    delay: 0,
    //Save shots in memory
    saveShots: true,
    // [jpeg, png] support varies
    // Webcam.OutputTypes
    output: "jpeg",
    //Which camera to use
    //Use Webcam.list() for results
    //false for default device
    device: false,
    // [location, buffer, base64]
    // Webcam.CallbackReturnTypes
    callbackReturn: "location",
    //Logging
    verbose: false
};
var Webcam = NodeWebcam.create( opts ); //starting up the webcam
//----------------------------------------------------------------------------//



//---------------------- SERIAL COMMUNICATION (Arduino) ----------------------//
// start the serial port connection and read on newlines
const serial = new SerialPort(process.argv[2], {});
const parser = new Readline({
  delimiter: '\r\n'
});

// Read data that is available on the serial port and send it to the websocket
serial.pipe(parser);
parser.on('data', function(data) {
  console.log('Data:', data);
  io.emit('server-msg', data);

  ///////////////////// Han's mod /////////////////////
  var imageName = new Date().toString().replace(/[&\/\\#,+()$~%.'":*?<>{}\s-]/g, '');

  console.log('making a making a picture at'+ imageName); // Second, the name is logged to the console.

    //Third, the picture is  taken and saved to the `public/`` folder
    NodeWebcam.capture('public/'+imageName, opts, function( err, data ) {
      io.emit('newPicture',(imageName+'.jpg')); ///Lastly, the new name is send to the client web browser.
      faceAnalysis(imageName + '.jpg', function(responseText){
      	 io.emit('newAnalysis', rTtoHTML(responseText));
         console.log('capture ', responseText);
      });
    /// The browser will take this new name and load the picture from the public folder.
    });
  ///////////////////////////////////////////////////////////////

});
//----------------------------------------------------------------------------//


//---------------------- WEBSOCKET COMMUNICATION (web browser)----------------//
// this is the websocket event handler and say if someone connects
// as long as someone is connected, listen for messages
io.on('connect', function(socket) {
  console.log('a user connected');

  // if you get the 'ledON' msg, send an 'H' to the Arduino
  socket.on('ledON', function() {
    console.log('ledON');
    serial.write('H');
  });

  // if you get the 'ledOFF' msg, send an 'L' to the Arduino
  socket.on('ledOFF', function() {
    console.log('ledOFF');
    serial.write('L');
  });

  //-- Addition: This function is called when the client clicks on the `Take a picture` button.
  socket.on('takePicture', function() {
    /// First, we create a name for the new picture.
    /// The .replace() function removes all special characters from the date.
    /// This way we can use it as the filename.
    var imageName = new Date().toString().replace(/[&\/\\#,+()$~%.'":*?<>{}\s-]/g, '');
    console.log('making a making a picture at'+ imageName); // Second, the name is logged to the console.

    //Third, the picture is  taken and saved to the `public/`` folder
    NodeWebcam.capture('public/'+imageName, opts, function( err, data ) {
      io.emit('newPicture',(imageName+'.jpg')); ///Lastly, the new name is send to the client web browser.
      faceAnalysis(imageName + '.jpg', function(responseText){
      	 io.emit('newAnalysis', rTtoHTML(responseText)); 
         console.log('capture ', responseText);
      });
    /// The browser will take this new name and load the picture from the public folder.
    });

  });
  // if you get the 'disconnect' message, say the user disconnected
  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
});
//----------------------------------------------------------------------------//
