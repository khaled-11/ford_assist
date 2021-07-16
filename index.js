const axios = require ("axios");
var querystring = require('querystring');
require('dotenv').config();
const express = require('express');
const path = require("path");
const fs = require('fs');
const mysql = require('mysql');
const key = fs.readFileSync('./key.pem');
const cert = fs.readFileSync('./cert.pem');
const CryptoJS = require("crypto-js");
const https = require('https');
const updateToken = require('./functions/updateToken');
const resolveText = require('./functions/resolve_text');
const updateVehicle = require('./functions/update_vehicle');
const location = require('./functions/location');
const status = require('./functions/status');
const lock = require('./functions/lock');
const unlock = require('./functions/unlock')
const start = require('./functions/start')
const stop = require('./functions/stop')

// Create app in express
app = express();
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Pool connection for the database
var pool  = mysql.createPool({
  connectionLimit : 90,
  host     : process.env.dbHOST,
  user     : process.env.dbUSER,
  password : process.env.dbPSWD,
  database : 'house'
});

// Create https server
const server = https.createServer({key: key, cert: cert }, app);
app.get(`/loc`, async function(request, res) {
  t = await location()
  console.log(t)
});


// Verification code for creating campaign ****
app.get(`/`, async function(request, res) {
  var cre_data;
  var query = pool.query(`select * from env_var where clientId = "30990062-9618-40e1-a27b-7c6bcb23658a";`);
  query
  .on('error', function(err) {
    console.log(error)
  })
  .on('result', async function(row) {
    cre_data = row;
    console.log("Reading Env variables!")
  })
  .on('end', async function() {
    var url = `https://dah2vb2cprod.b2clogin.com/914d88b1-3523-4bf6-9be4-1b96b4f6f919/oauth2/v2.0/token?p=${cre_data.policy}`
    var bytes  = CryptoJS.AES.decrypt(cre_data.clientSecret, process.env.KEY);
    var secret = bytes.toString(CryptoJS.enc.Utf8);   
    axios.post(url, querystring.stringify({
        grant_type:"authorization_code",
        client_id:cre_data.clientId,
        client_secret:secret,
        code:request.query.code,
        redirect_uri:cre_data.clientSecret.redirectUri
      }), {
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }).then(function(response) {
        console.log("Generated Token Success!")
        var enToken = CryptoJS.AES.encrypt(`${response.data.access_token}`, process.env.KEY).toString();      
        var reToken = CryptoJS.AES.encrypt(`${response.data.refresh_token}`, process.env.KEY).toString();      
        var query = pool.query(`update env_var SET accessToken = "${enToken}", refreshToken = "${reToken}";`);
        query
        .on('error', function(err) {
            console.log(err)
        })
        .on('result', async function(row) {
          console.log("Encrypted and updated the Access Token!")
        })
        .on('end', async function() {
          updateVehicle();
          location();
          status();
          updateToken();
          res.render("index")
        });
    }).catch(function(error){
        console.log(error)
        res.send("Enter valid Code")
    });
  });
});

// Verification code for creating campaign ****
app.post(`/data`, async function(request, response) {
  intent = await resolveText(request.body.text);
  console.log(intent)
  if (intent.intents[0] && intent.intents[0].name === "lock"){
    lock();
    await sleep(2200);
    response.send({locked:"good"})
  } else if (intent.intents[0] && intent.intents[0].name === "unlock"){
    unlock()
    await sleep(2200);
    response.send({unlocked:"good"})
  } else if (intent.intents[0] && intent.intents[0].name === "start"){
    start()
    await sleep(2200);
    response.send({started:"good"})
  } else if (intent.intents[0] && intent.intents[0].name === "stop"){
    stop()
    await sleep(2200);
    response.send({stopped:"good"})
  } else if (intent.intents[0] && intent.intents[0].name === "reminders"){
    if (intent.entities['wit$location:location'] && intent.entities['reason:reason']){
      response.send({remind:`Okay, I will remind your to (<b>${intent.entities['reason:reason'][0].body}</b>) when the car is near (<b>${intent.entities['wit$location:location'][0].body}</b>)`})
    } else {
      response.send({fdf:"fdf"})
    }
  }  else if (intent.intents[0] && intent.intents[0].name === "location"){
    var query = pool.query('select * from location;');
    query
    .on('result', async function(row) {
      response.send({location:`The car is located at (<b>${row.lon}, ${row.lat}</b>). The speed is (<b>${row.speed}</b>), and the direction is (<b>${row.direction}</b>).`})
    })
  }  else if (intent.intents[0] && intent.intents[0].name === "status"){
    var query = pool.query('select * from status;');
    query
    .on('result', async function(row) {
      response.send({status:`The car is (<b>${row.lock_status}</b>). The alarm is (<b>${row.alarm}</b>).`})
    })
  } else {
    response.send({none:"nothing"})
  }
});

//Function to load the data
//loadData();
function loadData(){
  var enSecret = CryptoJS.AES.encrypt(`T_Wk41dx2U9v22R5sQD4Z_E1u-l2B-jXHE`, process.env.KEY).toString();
  var step1 = mysql.createConnection({
      host     : process.env.dbHOST,
      user     : process.env.dbUSER,
      password : process.env.dbPSWD,
      database:"house"
    });
    step1.connect();
    // var query = step1.query(`drop table env_var;`);
    // var query0 = step1.query(`CREATE TABLE IF NOT EXISTS env_var (applicationId text, clientId text, clientSecret text, policy text, tenant text, redirectUri text, redirectUriEncoded text, appScopeEncoded text, api_version text, accessToken text, refreshToken text, vehicleId text, commandId text, UnlockcommandId text, LockcommandId text, StopcommandId text, StartCommandId text, LocationcommandId text, StatusRefreshcommandId text, WakecommandId text, statuscommandId text);`);
    // var query1 = step1.query(`CREATE TABLE IF NOT EXISTS reminders(location_name text, lon text, lat text, reason int);`);
    // var query2 = step1.query(`insert into env_var(applicationId,clientId,clientSecret,policy,tenant,redirectUri,redirectUriEncoded,appScopeEncoded,api_version) values("afdc085b-377a-4351-b23e-5e1d35fb3700","30990062-9618-40e1-a27b-7c6bcb23658a","${enSecret}","B2C_1A_signup_signin_common","dah2vb2cpreprod.onmicrosoft.com","https://localhost:3000","https%3A%2F%2Flocalhost%3A3000","https%3A%2F%2Fdah2vb2cpreprod.onmicrosoft.com%2Fgeostorm-qa%2Fsimulator","2020-06-01");`);
    // var query01 = step1.query(`CREATE TABLE IF NOT EXISTS status (lock_status text, alarm text);`);
    // var query11 = step1.query(`CREATE TABLE IF NOT EXISTS location(lon text, lat text, speed text, direction text);`);
    
    var query = step1.query(`insert into location(lon,lat,speed,direction) values("","","","")`);
  query
    .on('error', function(err) {
        console.log(err)
    })
    .on('result', async function(row) {
      console.log(row)
    })
    .on('end', async function() {
      step1.end();
    });
}

// Function to check the data (Dev)
//checkData();
function checkData(){
    var query3 = pool.query('select * from env_var;');
    query3
    .on('result', async function(row) {
        console.log(row)
    })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

  // listen for webhook events
server.listen(process.env.PORT || 3000, () => console.log('webhook is listening'));

