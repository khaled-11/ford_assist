const mysql = require('mysql');
const CryptoJS = require("crypto-js");
const axios = require ("axios");
var querystring = require('querystring');


// Pool connection for the database
var pool  = mysql.createPool({
    connectionLimit : 90,
    host     : process.env.dbHOST,
    user     : process.env.dbUSER,
    password : process.env.dbPSWD,
    database : 'house'
  });

/// Function to Get App Traits ///
module.exports = async () => {
  try{
    setInterval(function(){
        var cre_data;     
        var query = pool.query('select * from env_var;');
        query
        .on('result', async function(row) {
            cre_data = row
            console.log("Reading Env variables!")
        })
        .on('end', async function() {
            var bytes  = CryptoJS.AES.decrypt(cre_data.clientSecret, process.env.KEY);
            var secret = bytes.toString(CryptoJS.enc.Utf8); 
            var bytes2  = CryptoJS.AES.decrypt(cre_data.refreshToken, process.env.KEY);
            var reToken = bytes2.toString(CryptoJS.enc.Utf8); 
            var url = `https://dah2vb2cprod.b2clogin.com/914d88b1-3523-4bf6-9be4-1b96b4f6f919/oauth2/v2.0/token?p=${cre_data.policy}`
            axios.post(url,
                querystring.stringify({
                    grant_type:"refresh_token",
                    client_id:cre_data.clientId,
                    client_secret:secret,
                    refresh_token:reToken
                }), {
                headers: { 
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }).then(function(response) {
                console.log("Generated New Token Success!")
                var enToken = CryptoJS.AES.encrypt(`${response.data.access_token}`, process.env.KEY).toString();      
                var reToken = CryptoJS.AES.encrypt(`${response.data.refresh_token}`, process.env.KEY).toString();      
                var query = pool.query(`update env_var SET accessToken = "${enToken}", refreshToken = "${reToken}";`);
                query
                .on('error', function(err) {
                    console.log(err)
                })
                .on('result', async function(row) {
                    console.log("Encrypted and updated the new Access Token!")
                })
            }).catch(function(error){
                console.log(error)
            });
            })
    }, 50000);
  }
  catch (e){
    return;
  }
   return;
};

