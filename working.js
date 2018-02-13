var https=require ('https');
var fs=require("fs");
var queryString = require('query-string');

// https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect

// Request parameters.
var params = {
    "returnFaceId": "true",
    "returnFaceLandmarks": "false",
    "returnFaceAttributes": "age,gender,headPose,smile,facialHair,glasses,emotion,hair,makeup,occlusion,accessories,blur,exposure,noise",
    "subscription-key": "e46d6a4b665f41cc8a67e932b7aa57d4"
};

var stringified = queryString.stringify(params);
console.log('stringify ', stringified);

fs.readFile("1.jpg", function(err, data) {
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
                console.log(responseText)
            });

        });

        post_req.write(data);

        post_req.end();
    }
});